# AGENT HUB

Standalone control website for managing multiple AI agents.

## Architecture

AGENT HUB is the control plane. Managed projects stay separate.

AGENT HUB -> Agent Adapter -> Agent -> Target project

The first managed agent is PRINTSHOP Engineer. Future agents can be connected without rebuilding the hub.

## Agent contract

A connected agent should expose:

- id
- name
- role
- capabilities
- status
- target
- server-side adapter
- safety policy
- health check

The hub must never display or store agent secrets in client code.

## Current agent

- id: printshop-engineer
- target: bekmurodtursunmuxamedov-lab/print-style-uz
- capabilities: Inspect, Fix, Improve, Deploy
- protected: constructor, production DB, auth, payments, orders

## Planned modules

1. Persistent agent registry
2. Connect/test agent
3. Real-time health for every agent
4. Task queue
5. Approval center
6. Activity/audit log
7. GitHub PR and Vercel deployment viewer
8. Multi-agent task routing
9. Permission boundaries for agent-to-agent delegation

## Separation rules

AGENT HUB source lives in this repository. PRINTSHOP source remains in print-style-uz. Do not use PRINTSHOP production Supabase as the hub database without explicit approval.
