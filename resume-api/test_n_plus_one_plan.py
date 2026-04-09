from sqlalchemy import select, func
from database import Team, TeamMember, TeamResume

stmt = (
    select(
        Team,
        select(func.count(TeamMember.id))
        .where(TeamMember.team_id == Team.id)
        .correlate(Team)
        .scalar_subquery()
        .label("member_count"),
        select(func.count(TeamResume.id))
        .where(TeamResume.team_id == Team.id)
        .correlate(Team)
        .scalar_subquery()
        .label("resume_count"),
    )
    .join(TeamMember, Team.id == TeamMember.team_id)
    .where(TeamMember.user_id == 1)
)
print("Query created successfully!")
