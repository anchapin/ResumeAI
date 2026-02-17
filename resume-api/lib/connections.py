"""
Connection Finder Library

Provides functionality to find connections at target companies using
GitHub and other data sources.
"""

import httpx
import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class Connection:
    """Represents a found connection."""
    name: str
    company: str
    title: str
    connection_type: str  # 'github', 'alumni', 'previous_company', 'shared_connection'
    profile_url: str
    avatar_url: Optional[str] = None
    similarity_score: float = 0.0


class ConnectionFinder:
    """Finds professional connections at target companies."""

    def __init__(self, github_token: Optional[str] = None):
        self.github_token = github_token
        self.github_headers = {}
        if github_token:
            self.github_headers['Authorization'] = f'token {github_token}'

    async def find_connections(
        self,
        target_company: str,
        user_profile: Dict[str, Any],
        limit: int = 10
    ) -> List[Connection]:
        """
        Find connections at a target company.

        Args:
            target_company: Name of the company to search
            user_profile: User's profile with education/experience history
            limit: Maximum number of connections to return

        Returns:
            List of Connection objects
        """
        connections = []

        # Run searches in parallel
        tasks = [
            self._find_github_employees(target_company, limit),
            self._find_alumni(target_company, user_profile.get('education', [])),
            self._find_previous_company_connections(
                target_company,
                user_profile.get('experience', [])
            ),
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect all connections
        for result in results:
            if isinstance(result, list):
                connections.extend(result)

        # Sort by similarity score and limit
        connections.sort(key=lambda x: x.similarity_score, reverse=True)
        return connections[:limit]

    async def _find_github_employees(
        self,
        company: str,
        limit: int
    ) -> List[Connection]:
        """Find employees at company using GitHub API."""
        connections = []

        try:
            # Search GitHub users by company
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    'https://api.github.com/search/users',
                    params={
                        'q': f'company:{company} in:login',
                        'per_page': limit
                    },
                    headers=self.github_headers
                )

                if response.status_code == 200:
                    data = response.json()
                    for item in data.get('items', []):
                        # Get user details
                        user_response = await client.get(
                            item['url'],
                            headers=self.github_headers
                        )
                        if user_response.status_code == 200:
                            user = user_response.json()
                            connection = Connection(
                                name=user.get('name', item['login']),
                                company=company,
                                title=user.get('bio', 'GitHub User'),
                                connection_type='github',
                                profile_url=user.get('html_url', ''),
                                avatar_url=user.get('avatar_url'),
                                similarity_score=0.5
                            )
                            connections.append(connection)
        except Exception as e:
            print(f"GitHub search error: {e}")

        return connections

    async def _find_alumni(
        self,
        target_company: str,
        education: List[Dict]
    ) -> List[Connection]:
        """Find alumni from same school now at target company."""
        connections = []

        if not education:
            return connections

        schools = set()
        for edu in education:
            if edu.get('institution'):
                schools.add(edu['institution'])

        # Search GitHub for users from same schools at target company
        for school in schools:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    # Search for users who worked at target_company and attended school
                    response = await client.get(
                        'https://api.github.com/search/users',
                        params={
                            'q': f'company:{target_company} school:{school}',
                            'per_page': 5
                        },
                        headers=self.github_headers
                    )

                    if response.status_code == 200:
                        data = response.json()
                        for item in data.get('items', []):
                            connection = Connection(
                                name=item.get('name', item['login']),
                                company=target_company,
                                title=item.get('bio', 'Alumni'),
                                connection_type='alumni',
                                profile_url=item.get('html_url', ''),
                                avatar_url=item.get('avatar_url'),
                                similarity_score=0.8  # Higher score for alumni
                            )
                            connections.append(connection)
            except Exception as e:
                print(f"Alumni search error: {e}")

        return connections

    async def _find_previous_company_connections(
        self,
        target_company: str,
        experience: List[Dict]
    ) -> List[Connection]:
        """Find people who previously worked at same companies."""
        connections = []

        if not experience:
            return connections

        # Get previous companies
        previous_companies = set()
        for exp in experience:
            if exp.get('company') and not exp.get('current'):
                previous_companies.add(exp['company'])

        # Search for users who worked at both previous companies and target
        for prev_company in previous_companies:
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.get(
                        'https://api.github.com/search/users',
                        params={
                            'q': f'company:{target_company} company:{prev_company}',
                            'per_page': 5
                        },
                        headers=self.github_headers
                    )

                    if response.status_code == 200:
                        data = response.json()
                        for item in data.get('items', []):
                            connection = Connection(
                                name=item.get('name', item['login']),
                                company=target_company,
                                title=item.get('bio', 'Previous Company Connection'),
                                connection_type='previous_company',
                                profile_url=item.get('html_url', ''),
                                avatar_url=item.get('avatar_url'),
                                similarity_score=0.7
                            )
                            connections.append(connection)
            except Exception as e:
                print(f"Previous company search error: {e}")

        return connections

    def generate_outreach_suggestions(
        self,
        connection: Connection,
        user_profile: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Generate personalized outreach suggestions.

        Returns templates for different connection types.
        """
        user_name = user_profile.get('name', 'there')
        user_school = None

        if user_profile.get('education'):
            user_school = user_profile['education'][0].get('institution')

        if user_profile.get('experience'):
            pass

        templates = {
            'github': (
                f"Hi {connection.name}! I'm {user_name} and noticed we're both at {connection.company}. "
                f"I'd love to connect and learn more about your experience there."
            ),
            'alumni': (
                f"Hi {connection.name}! I'm {user_name}, also a {user_school} alum. "
                f"I noticed you're at {connection.company} and I'd love to connect - "
                f"always great to meet fellow alumni!"
            ),
            'previous_company': (
                f"Hi {connection.name}! I'm {user_name} and noticed we have a shared connection - "
                f"I previously worked at {connection.connection_type}. "
                f"I'm very interested in learning more about your experience at {connection.company}."
            ),
            'shared_connection': (
                f"Hi {connection.name}! I'm {user_name} and noticed we might have "
                f"some connections in common. I'd love to connect and learn more "
                f"about your work at {connection.company}."
            )
        }

        return {
            'short': templates.get(connection.connection_type, templates['github']),
            'medium': templates.get(connection.connection_type, templates['github']) + (
                " I'd be happy to share some insights from my experience as well."
            ),
            'long': templates.get(connection.connection_type, templates['github']) + (
                f" I'm currently exploring opportunities in the {user_profile.get('role', 'tech')} space "
                f"and would greatly appreciate any advice you might have."
            )
        }
