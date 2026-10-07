import time
from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION = 300  # 5 minutes in seconds
ATTEMPT_WINDOW = 300    # 5 minutes window


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')


def _clean_identifier(identifier):
    if not identifier:
        return ''
    return str(identifier).strip().lower()


def _ip_base_key(role, ip):
    return f'areacare:{role}:ip:{ip}'


def _ident_base_key(role, ident):
    return f'areacare:{role}:ident:{ident}'


def _lockout_key(base_key):
    return f'lockout:{base_key}'


def _attempts_key(base_key):
    return f'attempts:{base_key}'


def _get_lockout_remaining(lockout_key):
    expires_at = cache.get(lockout_key)
    if expires_at is not None:
        remaining = int(expires_at - time.time())
        if remaining > 0:
            return remaining
        cache.delete(lockout_key)
    return 0


def check_login_rate_limit(request, identifier, role):
    """
    Checks whether the login is currently locked out for the given IP or identifier.
    Returns: (is_locked: bool, remaining_seconds: int)
    """
    ip = get_client_ip(request)
    ident = _clean_identifier(identifier)

    # Check IP lockout
    ip_remaining = _get_lockout_remaining(_lockout_key(_ip_base_key(role, ip)))
    if ip_remaining > 0:
        return True, ip_remaining

    # Check identifier lockout (account-specific)
    if ident:
        ident_remaining = _get_lockout_remaining(_lockout_key(_ident_base_key(role, ident)))
        if ident_remaining > 0:
            return True, ident_remaining

    return False, 0


def record_failed_attempt(request, identifier, role):
    """
    Increments failed attempts counter for IP and identifier.
    Locks out for LOCKOUT_DURATION if MAX_FAILED_ATTEMPTS reached.
    Returns: (is_locked: bool, remaining_seconds: int, attempts_left: int)
    """
    ip = get_client_ip(request)
    ident = _clean_identifier(identifier)
    now = time.time()

    keys = [_ip_base_key(role, ip)]
    if ident:
        keys.append(_ident_base_key(role, ident))

    is_locked = False
    min_attempts_left = MAX_FAILED_ATTEMPTS

    for base_key in keys:
        att_key = _attempts_key(base_key)
        lock_key = _lockout_key(base_key)

        attempts = cache.get(att_key, 0) + 1
        cache.set(att_key, attempts, timeout=ATTEMPT_WINDOW)

        attempts_left = max(0, MAX_FAILED_ATTEMPTS - attempts)
        if attempts_left < min_attempts_left:
            min_attempts_left = attempts_left

        if attempts >= MAX_FAILED_ATTEMPTS:
            cache.set(lock_key, now + LOCKOUT_DURATION, timeout=LOCKOUT_DURATION)
            cache.delete(att_key)
            is_locked = True

    if is_locked:
        return True, LOCKOUT_DURATION, 0

    return False, 0, min_attempts_left


def clear_login_attempts(request, identifier, role):
    """
    Clears failed attempt counters and active lockouts for the IP and identifier on success.
    """
    ip = get_client_ip(request)
    ident = _clean_identifier(identifier)

    keys = [_ip_base_key(role, ip)]
    if ident:
        keys.append(_ident_base_key(role, ident))

    for base_key in keys:
        cache.delete(_attempts_key(base_key))
        cache.delete(_lockout_key(base_key))


def lockout_response(remaining_seconds):
    """
    Generates standard HTTP 429 response for lockout.
    """
    minutes = max(1, (remaining_seconds + 59) // 60)
    return Response(
        {
            'error': f'Too many failed login attempts. Please try again after {minutes} minute{"s" if minutes > 1 else ""}.',
            'lockout': True,
            'retry_after': remaining_seconds,
        },
        status=status.HTTP_429_TOO_MANY_REQUESTS,
        headers={'Retry-After': str(remaining_seconds)},
    )


def failed_attempt_response(attempts_left, default_error):
    """
    Generates standard 401 response with warning when attempts_left is low.
    """
    if 0 < attempts_left <= 3:
        error_msg = f'{default_error} {attempts_left} attempt{"s" if attempts_left > 1 else ""} remaining before temporary lockout.'
        return Response(
            {
                'error': error_msg,
                'attempts_left': attempts_left,
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return Response(
        {'error': default_error, 'attempts_left': attempts_left},
        status=status.HTTP_401_UNAUTHORIZED,
    )
