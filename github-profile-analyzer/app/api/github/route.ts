import { NextResponse } from 'next/server';
import connect from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { fetchGithubUserData } from '@/lib/github/api';

export async function GET(request: Request, { params }: { params: { username: string } }) {
  const { username } = params;

  try {
    await connect();

    // Check if the user already exists in the database
    let user = await User.findOne({ login: username });

    if (!user) {
      // Fetch user data from GitHub API
      user = await fetchGithubUserData(username);

      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      // Save the user data to the database
      await User.create(user);
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}