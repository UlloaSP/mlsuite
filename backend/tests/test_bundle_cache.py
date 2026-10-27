"""Verified bundles are kept by SHA-256, bounded by the size of their artifacts."""

from mlsuite_backend.bundles import LoadedBundles


def test_held_bundles_are_bounded_by_artifact_size_least_recently_used_first() -> None:
    held = LoadedBundles(max_bytes=10)
    first, second, third = object(), object(), object()
    held.keep("a", first, 4)
    held.keep("b", second, 4)
    assert held.get("a") is first

    held.keep("c", third, 4)

    assert held.get("b") is None
    assert held.get("a") is first
    assert held.get("c") is third


def test_a_bundle_larger_than_the_bound_is_held_alone() -> None:
    held = LoadedBundles(max_bytes=10)
    small, large = object(), object()
    held.keep("small", small, 4)

    held.keep("large", large, 50)

    assert held.get("small") is None
    assert held.get("large") is large


def test_keeping_a_held_bundle_again_returns_the_one_held() -> None:
    held = LoadedBundles(max_bytes=10)
    first, duplicate = object(), object()
    held.keep("a", first, 4)

    assert held.keep("a", duplicate, 4) is first
    held.keep("b", object(), 6)
    assert held.get("a") is first
