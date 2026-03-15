"""
API models package.

Re-exports models from api/models.py for backward compatibility
and provides additional model modules.
"""

# Re-export from api/models.py (the file, not this package)
# Import the actual models.py file directly
import sys
from pathlib import Path

# Add current directory to path to ensure we can import models.py
# This is a workaround because we have both api/models.py and api/models/ directory
_models_file = Path(__file__).parent.parent / "models.py"
if _models_file.exists():
    import importlib.util
    spec = importlib.util.spec_from_file_location("api.models_file", str(_models_file))
    _models_module = importlib.util.module_from_spec(spec)
    sys.modules["api.models_file"] = _models_module
    spec.loader.exec_module(_models_module)
else:
    _models_module = None

# Re-export common model classes
ResumeRequest = getattr(_models_module, 'ResumeRequest', None)
TailorRequest = getattr(_models_module, 'TailorRequest', None)
VariantsResponse = getattr(_models_module, 'VariantsResponse', None)
VariantMetadata = getattr(_models_module, 'VariantMetadata', None)
TailoredResumeResponse = getattr(_models_module, 'TailoredResumeResponse', None)
ErrorResponse = getattr(_models_module, 'ErrorResponse', None)
ResumeData = getattr(_models_module, 'ResumeData', None)
GitHubStatusResponse = getattr(_models_module, 'GitHubStatusResponse', None)
GenerateQuestionsRequest = getattr(_models_module, 'GenerateQuestionsRequest', None)
GenerateQuestionsResponse = getattr(_models_module, 'GenerateQuestionsResponse', None)
JDAnalysisRequest = getattr(_models_module, 'JDAnalysisRequest', None)
JDAnalysisResponse = getattr(_models_module, 'JDAnalysisResponse', None)
JDFetchRequest = getattr(_models_module, 'JDFetchRequest', None)
JDFetchResponse = getattr(_models_module, 'JDFetchResponse', None)
SkillsMatchRequest = getattr(_models_module, 'SkillsMatchRequest', None)
SkillsMatchResponse = getattr(_models_module, 'SkillsMatchResponse', None)
ATSCheckRequest = getattr(_models_module, 'ATSCheckRequest', None)
ATSCheckResponse = getattr(_models_module, 'ATSCheckResponse', None)
JDInsightsRequest = getattr(_models_module, 'JDInsightsRequest', None)
JDInsightsResponse = getattr(_models_module, 'JDInsightsResponse', None)
SkillGapRequest = getattr(_models_module, 'SkillGapRequest', None)
SkillGapResponse = getattr(_models_module, 'SkillGapResponse', None)
SalaryInfo = getattr(_models_module, 'SalaryInfo', None)
ATSIssue = getattr(_models_module, 'ATSIssue', None)
InterviewQuestion = getattr(_models_module, 'InterviewQuestion', None)
InterviewAnswer = getattr(_models_module, 'InterviewAnswer', None)
InterviewFeedback = getattr(_models_module, 'InterviewFeedback', None)
InterviewSession = getattr(_models_module, 'InterviewSession', None)
SubmitAnswerRequest = getattr(_models_module, 'SubmitAnswerRequest', None)
GetFeedbackRequest = getattr(_models_module, 'GetFeedbackRequest', None)
SessionHistoryResponse = getattr(_models_module, 'SessionHistoryResponse', None)

# User authentication models
UserCreate = getattr(_models_module, 'UserCreate', None)
UserLogin = getattr(_models_module, 'UserLogin', None)
UserResponse = getattr(_models_module, 'UserResponse', None)
UserUpdate = getattr(_models_module, 'UserUpdate', None)
TokenResponse = getattr(_models_module, 'TokenResponse', None)
RefreshTokenRequest = getattr(_models_module, 'RefreshTokenRequest', None)
TokenRefreshResponse = getattr(_models_module, 'TokenRefreshResponse', None)
PasswordChangeRequest = getattr(_models_module, 'PasswordChangeRequest', None)
MessageResponse = getattr(_models_module, 'MessageResponse', None)
VerifyEmailRequest = getattr(_models_module, 'VerifyEmailRequest', None)
ResendVerificationRequest = getattr(_models_module, 'ResendVerificationRequest', None)

# Team models
TeamMemberRole = getattr(_models_module, 'TeamMemberRole', None)
TeamMemberUpdate = getattr(_models_module, 'TeamMemberUpdate', None)
TeamCreate = getattr(_models_module, 'TeamCreate', None)
TeamUpdate = getattr(_models_module, 'TeamUpdate', None)
TeamInvite = getattr(_models_module, 'TeamInvite', None)
TeamMemberResponse = getattr(_models_module, 'TeamMemberResponse', None)
TeamResponse = getattr(_models_module, 'TeamResponse', None)
TeamDetailResponse = getattr(_models_module, 'TeamDetailResponse', None)
TeamResumeShare = getattr(_models_module, 'TeamResumeShare', None)
TeamActivityResponse = getattr(_models_module, 'TeamActivityResponse', None)

# Comment models
ResumeCommentCreate = getattr(_models_module, 'ResumeCommentCreate', None)
ResumeCommentResponse = getattr(_models_module, 'ResumeCommentResponse', None)
CommentRequest = getattr(_models_module, 'CommentRequest', None)
CommentResponse = getattr(_models_module, 'CommentResponse', None)
ResumeCommentUpdate = getattr(_models_module, 'ResumeCommentUpdate', None)

# Remaining models
BasicInfo = getattr(_models_module, 'BasicInfo', None)
Profile = getattr(_models_module, 'Profile', None)
WorkItem = getattr(_models_module, 'WorkItem', None)
EducationItem = getattr(_models_module, 'EducationItem', None)
ProjectItem = getattr(_models_module, 'ProjectItem', None)
Skill = getattr(_models_module, 'Skill', None)
Location = getattr(_models_module, 'Location', None)
ExportRequest = getattr(_models_module, 'ExportRequest', None)
ResumeResponse = getattr(_models_module, 'ResumeResponse', None)
CreateResumeRequest = getattr(_models_module, 'CreateResumeRequest', None)
UpdateResumeRequest = getattr(_models_module, 'UpdateResumeRequest', None)
ResumeMetadata = getattr(_models_module, 'ResumeMetadata', None)
ResumeVersionResponse = getattr(_models_module, 'ResumeVersionResponse', None)
ShareResumeRequest = getattr(_models_module, 'ShareResumeRequest', None)
ShareResumeResponse = getattr(_models_module, 'ShareResumeResponse', None)
ImportRequest = getattr(_models_module, 'ImportRequest', None)
BatchCreateRequest = getattr(_models_module, 'BatchCreateRequest', None)
BatchCreateResponse = getattr(_models_module, 'BatchCreateResponse', None)
BatchUpdateRequest = getattr(_models_module, 'BatchUpdateRequest', None)
BatchUpdateResponse = getattr(_models_module, 'BatchUpdateResponse', None)
BatchDeleteRequest = getattr(_models_module, 'BatchDeleteRequest', None)
BatchDeleteResponse = getattr(_models_module, 'BatchDeleteResponse', None)
BatchExportRequest = getattr(_models_module, 'BatchExportRequest', None)
BatchExportResponse = getattr(_models_module, 'BatchExportResponse', None)
BatchProgressResponse = getattr(_models_module, 'BatchProgressResponse', None)
BulkOperationRequest = getattr(_models_module, 'BulkOperationRequest', None)
BulkOperationResponse = getattr(_models_module, 'BulkOperationResponse', None)
JobStatusResponse = getattr(_models_module, 'JobStatusResponse', None)
QueueStatsResponse = getattr(_models_module, 'QueueStatsResponse', None)
SubmitPDFRenderJobRequest = getattr(_models_module, 'SubmitPDFRenderJobRequest', None)
SubmitPDFRenderJobResponse = getattr(_models_module, 'SubmitPDFRenderJobResponse', None)
HealthResponse = getattr(_models_module, 'HealthResponse', None)
GitHubCLIStatus = getattr(_models_module, 'GitHubCLIStatus', None)
GitHubDisconnectResponse = getattr(_models_module, 'GitHubDisconnectResponse', None)
ColorScheme = getattr(_models_module, 'ColorScheme', None)
FormatOptions = getattr(_models_module, 'FormatOptions', None)
KeyboardShortcut = getattr(_models_module, 'KeyboardShortcut', None)
SavedTemplateConfiguration = getattr(_models_module, 'SavedTemplateConfiguration', None)
TemplateCustomization = getattr(_models_module, 'TemplateCustomization', None)
TemplateFilter = getattr(_models_module, 'TemplateFilter', None)
TemplateMetadata = getattr(_models_module, 'TemplateMetadata', None)
UserSettingsRequest = getattr(_models_module, 'UserSettingsRequest', None)
UserSettingsResponse = getattr(_models_module, 'UserSettingsResponse', None)

__all__ = [
    "ResumeRequest",
    "TailorRequest",
    "VariantsResponse",
    "VariantMetadata",
    "TailoredResumeResponse",
    "ErrorResponse",
    "ResumeData",
    "GitHubStatusResponse",
    "GenerateQuestionsRequest",
    "GenerateQuestionsResponse",
    "JDAnalysisRequest",
    "JDAnalysisResponse",
    "JDFetchRequest",
    "JDFetchResponse",
    "SkillsMatchRequest",
    "SkillsMatchResponse",
    "ATSCheckRequest",
    "ATSCheckResponse",
    "JDInsightsRequest",
    "JDInsightsResponse",
    "SkillGapRequest",
    "SkillGapResponse",
    "SalaryInfo",
    "ATSIssue",
    "InterviewQuestion",
    "InterviewAnswer",
    "InterviewFeedback",
    "InterviewSession",
    "SubmitAnswerRequest",
    "GetFeedbackRequest",
    "SessionHistoryResponse",
    "UserCreate",
    "UserLogin", 
    "UserResponse",
    "UserUpdate",
    "TokenResponse",
    "RefreshTokenRequest",
    "TokenRefreshResponse",
    "PasswordChangeRequest",
    "MessageResponse",
    "VerifyEmailRequest",
    "ResendVerificationRequest",
    # Team models
    "TeamMemberRole",
    "TeamMemberUpdate",
    "TeamCreate",
    "TeamUpdate",
    "TeamInvite",
    "TeamMemberResponse",
    "TeamResponse",
    "TeamDetailResponse",
    "TeamResumeShare",
    "TeamActivityResponse",
]
