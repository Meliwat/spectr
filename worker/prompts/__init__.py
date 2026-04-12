from .screen_analysis import (
    PROMPT_1_SYSTEM,
    PROMPT_1_USER,
    SCREEN_JSON_SYSTEM,
    SCREEN_JSON_USER,
)
from .design_tokens import PROMPT_1B_SYSTEM, PROMPT_1B_USER
from .transition_analysis import TRANSITION_ANALYSIS_SYSTEM, TRANSITION_ANALYSIS_USER
from .frontend_codegen import (
    MOBILE_FRONTEND_SYSTEM,
    MOBILE_FRONTEND_USER,
    MOBILE_VIEW_MODEL_SYSTEM,
    MOBILE_VIEW_MODEL_USER,
)
from .repair import MOBILE_REPAIR_SYSTEM, MOBILE_REPAIR_USER
from .legacy_spec import (
    PROMPT_2_SYSTEM,
    PROMPT_2_USER,
    PROMPT_3_SYSTEM,
    PROMPT_3_USER,
    SPEC_SECTION_SYSTEM,
    SPEC_SECTION_DEFINITIONS,
    build_spec_section_prompt,
)
