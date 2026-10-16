# Local copy of doubt-driven-development skill
# Source: c:\Users\admin\Desktop\va-freelance-hub\.agents\skills\doubt-driven-development\SKILL.md

Core methodology:
Subject every non-trivial decision / code artifact to adversarial verification.
Assume the author is overconfident. Look for:
- Unstated assumptions
- Edge cases not handled
- Hidden coupling or shared state
- Ways the contract could be violated
- Existing conventions this might break
- Failure modes under unexpected input
Empirically verify using tests/generators/oracles.
