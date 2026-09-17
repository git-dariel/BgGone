import pytest

from removebg_api.config import Settings


def test_lite_model_loads_from_environment(monkeypatch):
    monkeypatch.setenv("MODEL", "birefnet-lite")
    assert Settings.from_env().model == "birefnet-lite"


def test_u2netp_model_loads_from_environment(monkeypatch):
    monkeypatch.setenv("MODEL", "u2netp")
    assert Settings.from_env().model == "u2netp"


def test_portrait_model_loads_from_environment(monkeypatch):
    monkeypatch.setenv("MODEL", "birefnet-portrait")
    monkeypatch.setenv("EDGE_REFINEMENT", "auto")
    settings = Settings.from_env()
    assert settings.model == "birefnet-portrait"
    assert settings.edge_refinement == "auto"


def test_invalid_edge_refinement_is_rejected(monkeypatch):
    monkeypatch.setenv("EDGE_REFINEMENT", "blur")
    with pytest.raises(ValueError, match="EDGE_REFINEMENT"):
        Settings.from_env()


def test_u2netp_rejects_memory_heavy_alpha_matting(monkeypatch):
    monkeypatch.setenv("MODEL", "u2netp")
    monkeypatch.setenv("EDGE_REFINEMENT", "alpha")
    with pytest.raises(ValueError, match="EDGE_REFINEMENT=alpha"):
        Settings.from_env()
