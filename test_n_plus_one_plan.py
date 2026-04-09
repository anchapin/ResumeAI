from sqlalchemy import select, func
from database import Team, TeamMember, TeamResume

# Existing slow N+1 code:
# teams = result.scalars().all()
# for team in teams:
#    member_count = await db.execute(select(func.count(TeamMember.id)).where(TeamMember.team_id == team.id))
#    resume_count = await db.execute(select(func.count(TeamResume.id)).where(TeamResume.team_id == team.id))

# Fast Single Query code:
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
    # .options(selectinload(Team.members))
)
print(stmt)
