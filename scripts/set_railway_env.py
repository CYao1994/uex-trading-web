#!/usr/bin/env python3
"""
Set UEX_API_KEY environment variable on Railway.

Usage:
  python set_railway_env.py <RAILWAY_API_TOKEN>

Get your Railway API Token at:
  https://railway.app/account/tokens
"""
import sys
import json
import subprocess

# Railway config (from memory)
SERVICE_ID = "9fc7632d-a0e1-4dd8-846e-39815ced06f3"
RAILWAY_API = "https://backboard.railway.app/graphql/v2"
UEX_API_KEY = "d95a19310543bac9399a6e9b2479e63c64c4c906"

def rail_query(token: str, query: str, variables: dict = None):
    """Execute a GraphQL query against Railway API."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    result = subprocess.run(
        ["curl", "-s", "-k",
         "-H", f"Authorization: Bearer {token}",
         "-H", "Content-Type: application/json",
         "-X", "POST", RAILWAY_API,
         "-d", json.dumps(payload)],
        capture_output=True, text=True, timeout=30
    )
    return json.loads(result.stdout)

def get_existing_vars(token: str):
    """List current environment variables for the service."""
    query = """
    query($serviceId: String!) {
      service(id: $serviceId) {
        variables {
          edges {
            node {
              name
              value
            }
          }
        }
      }
    }
    """
    resp = rail_query(token, query, {"serviceId": SERVICE_ID})
    edges = resp.get("data", {}).get("service", {}).get("variables", {}).get("edges", [])
    return {e["node"]["name"]: e["node"]["value"] for e in edges}

def set_var(token: str, name: str, value: str):
    """Set a single environment variable on Railway."""
    mutation = """
    mutation($input: VariableUpsertInput!) {
      variableUpsert(input: $input)
    }
    """
    variables = {
        "input": {
            "name": name,
            "value": value,
            "serviceId": SERVICE_ID,
            "environmentName": "production"
        }
    }
    return rail_query(token, mutation, variables)

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nError: RAILWAY_API_TOKEN is required")
        sys.exit(1)

    token = sys.argv[1]
    print("Checking Railway API connection...")

    # Test connection
    try:
        existing = get_existing_vars(token)
        print(f"Connected! Current env vars: {list(existing.keys())}")
    except Exception as e:
        print(f"Failed to connect to Railway API: {e}")
        sys.exit(1)

    # Check if UEX_API_KEY already set
    if "UEX_API_KEY" in existing:
        current = existing["UEX_API_KEY"]
        if current == UEX_API_KEY:
            print(f"UEX_API_KEY already set correctly ({current[:8]}...{current[-4:]})")
            return
        else:
            print(f"UEX_API_KEY exists but differs: {current[:8]}...{current[-4:]}")
            print("Updating...")

    # Set the variable
    print(f"Setting UEX_API_KEY={UEX_API_KEY[:8]}...{UEX_API_KEY[-4:]}")
    result = set_var(token, "UEX_API_KEY", UEX_API_KEY)

    if result.get("data", {}).get("variableUpsert"):
        print("SUCCESS! UEX_API_KEY set on Railway.")
        print("Railway will auto-redeploy with the new variable.")
    else:
        print(f"Failed: {json.dumps(result, indent=2)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
