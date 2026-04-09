import asyncio
from sqlalchemy import select, func
from database import get_db_test_session, Team, TeamMember, TeamResume

async def main():
    print("Testing N+1 queries in list_teams")

if __name__ == "__main__":
    asyncio.run(main())
