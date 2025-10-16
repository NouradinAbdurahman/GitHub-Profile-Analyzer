import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ProfileAITools from "@/components/profile-ai-tools";

const ProfilePage = () => {
  const router = useRouter();
  const { username } = router.query;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      const fetchUserData = async () => {
        try {
          const response = await fetch(`/api/github/${username}`);
          const data = await response.json();
          setUser(data);
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchUserData();
    }
  }, [username]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return <ProfileAITools user={user} />;
};

export default ProfilePage;