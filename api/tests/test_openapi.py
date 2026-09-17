from pathlib import Path

import yaml
from openapi_spec_validator import validate


def test_openapi_contract_is_valid():
    spec = Path(__file__).resolve().parents[1] / "openapi.yaml"
    validate(yaml.safe_load(spec.read_text(encoding="utf-8")))
