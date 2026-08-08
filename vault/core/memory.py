"""
LockPy Vault - Memory Protection & Zeroing
Provides utilities for wiping sensitive data buffers in RAM.
"""

import ctypes
import sys
from typing import Union


def wipe_buffer(buffer: Union[bytearray, memoryview]) -> None:
    """
    Overwrites the memory buffer with zeroes to prevent secrets from lingering in RAM.
    """
    if isinstance(buffer, bytearray):
        for i in range(len(buffer)):
            buffer[i] = 0
    elif isinstance(buffer, memoryview):
        if not buffer.readonly:
            buffer[:] = b"\x00" * len(buffer)


def wipe_string_reference(val: str) -> None:
    """
    Best-effort attempt to overwrite ASCII/UTF-8 internal string buffer in CPython.
    Note: Immutable strings in Python cannot be guaranteed 100% wiped due to GC,
    so bytearray or memoryview should be used for raw secrets where possible.
    """
    if not isinstance(val, str) or not val:
        return
    try:
        # Obtain string internal buffer pointer if possible
        string_address = id(val) + sys.getsizeof(val) - len(val) - 1
        ctypes.memset(string_address, 0, len(val))
    except Exception:  # nosec B110
        pass


class SecureBuffer:
    """
    Context manager for holding sensitive bytes/bytearray in RAM
    and ensuring automatic zero-fill on exit.
    """

    def __init__(self, data: Union[bytes, bytearray, str]):
        if isinstance(data, str):
            self._buffer = bytearray(data.encode("utf-8"))
        elif isinstance(data, bytes):
            self._buffer = bytearray(data)
        elif isinstance(data, bytearray):
            self._buffer = data
        else:
            raise TypeError("Data must be str, bytes, or bytearray")

    def get_data(self) -> bytearray:
        return self._buffer

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        wipe_buffer(self._buffer)

    def __del__(self):
        wipe_buffer(self._buffer)
