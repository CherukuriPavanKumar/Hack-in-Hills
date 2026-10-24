from __future__ import annotations

import ipaddress
import socket
from typing import List, Optional
from urllib.parse import urlparse

from services.providers.base import ProviderError


BLOCKED_METADATA_IPS = {
    "169.254.169.254",  # AWS / GCP / Azure metadata service
    "metadata.google.internal",
}


def is_ip_private_or_restricted(ip_str: str) -> bool:
    """Return True if IP is private, loopback, link-local, multicast, or reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    except ValueError:
        return False


def validate_endpoint_url(
    url: str,
    allow_private: bool = False,
    allowed_hosts: Optional[List[str]] = None,
    allowed_custom_hosts: Optional[List[str]] = None,
) -> str:
    """
    Validate that an endpoint URL is safe from SSRF attacks.
    Raises ProviderError("SSRF_BLOCKED", ...) if destination is disallowed.
    """
    if allowed_custom_hosts:
        allowed_hosts = (allowed_hosts or []) + allowed_custom_hosts
    if not url or not isinstance(url, str):
        raise ProviderError(
            category="CONFIG_ERROR",
            message="Endpoint URL must be a non-empty string.",
            retryable=False,
        )

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ProviderError(
            category="SSRF_BLOCKED",
            message=f"Disallowed URL scheme '{parsed.scheme}'. Only 'http' and 'https' are permitted.",
            retryable=False,
        )

    hostname = parsed.hostname
    if not hostname:
        raise ProviderError(
            category="SSRF_BLOCKED",
            message="Invalid URL: Missing hostname.",
            retryable=False,
        )

    lower_host = hostname.lower()

    # Cloud metadata protection (always blocked)
    if lower_host in BLOCKED_METADATA_IPS:
        raise ProviderError(
            category="SSRF_BLOCKED",
            message="Access to cloud metadata IP is strictly blocked.",
            retryable=False,
        )

    # If explicit allowed_hosts list is specified, host must match
    if allowed_hosts:
        clean_allowed = [h.strip().lower() for h in allowed_hosts if h.strip()]
        if clean_allowed and lower_host not in clean_allowed:
            raise ProviderError(
                category="SSRF_BLOCKED",
                message=f"Host '{lower_host}' is not in the configured ALLOWED_CUSTOM_HOSTS allowlist.",
                retryable=False,
            )
        if clean_allowed and lower_host in clean_allowed:
            return url.rstrip("/")

    # If private endpoints are explicitly permitted (e.g. self-hosted local Ollama/vLLM in dev)
    if allow_private:
        return url.rstrip("/")

    # Resolve hostname to check for internal / private IP ranges
    try:
        # Get all resolved IP addresses
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for _, _, _, _, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if ip_str in BLOCKED_METADATA_IPS:
                raise ProviderError(
                    category="SSRF_BLOCKED",
                    message="Resolved IP targets cloud metadata service.",
                    retryable=False,
                )
            if is_ip_private_or_restricted(ip_str):
                raise ProviderError(
                    category="SSRF_BLOCKED",
                    message=(
                        f"Resolved IP '{ip_str}' belongs to a private/loopback/restricted network. "
                        "Set ALLOW_PRIVATE_ENDPOINTS=true in non-production environments to allow self-hosted endpoints."
                    ),
                    retryable=False,
                )
    except socket.gaierror as e:
        raise ProviderError(
            category="CONNECTION_ERROR",
            message=f"DNS resolution failed for host '{hostname}': {str(e)}",
            retryable=False,
        )

    return url.rstrip("/")
