import pytest

from changelog_gen.core import TypesError, build_preview, parse_types

MESSAGES = ["refactor(core)!: drop v1", "feat(api): add x", "docs: readme", "update stuff", "fix: bug"]


def test_parse_types_merges_and_orders_like_types():
    assert parse_types([" fix , feat", "fix"]) == ["feat", "fix"]


@pytest.mark.parametrize(
    ("values", "invalid"), [(["feat,feature"], ["feature"]), ([""], [""]), (["feat,", "FEAT"], ["", "FEAT"])]
)
def test_parse_types_reports_every_invalid_value(values, invalid):
    with pytest.raises(TypesError) as excinfo:
        parse_types(values)

    assert excinfo.value.invalid == invalid
    assert "expected one of feat, fix, docs" in str(excinfo.value)


def test_build_preview_without_filter():
    preview = build_preview(MESSAGES, None)

    assert preview.markdown.startswith("## Unreleased\n\n### Breaking Changes\n\n- **core**: drop v1\n")
    assert (preview.total, preview.included, preview.filtered_out) == (5, 4, 0)
    assert preview.skipped == [("update stuff", "not a Conventional Commit header: 'update stuff'")]


def test_build_preview_with_filter_keeps_breaking():
    preview = build_preview(MESSAGES, ["feat"])

    assert preview.markdown == (
        "## Unreleased\n\n### Breaking Changes\n\n- **core**: drop v1\n\n### Features\n\n- **api**: add x\n"
    )
    assert (preview.total, preview.included, preview.filtered_out, len(preview.skipped)) == (5, 2, 2, 1)


def test_build_preview_empty():
    preview = build_preview([], ["feat"])

    assert preview.markdown == "## Unreleased\n"
    assert (preview.total, preview.included, preview.filtered_out, preview.skipped) == (0, 0, 0, [])
