import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";
import { Camera, Calendar, UserIcon, Edit2, Check, X } from "lucide-react";
import type { Recipe } from "@/types";

interface UserProfile {
  username: string;
  display_name: string;
  bio: string;
  avatar: string | null;
  date_joined: string;
}

export function ProfilePage() {
  const { username: routeUsername } = useParams<{ username: string }>();
  const cleanUsername = routeUsername?.replace("@", "");
  const { token, username: currentUsername } = useAuth();
  const isOwnProfile = cleanUsername === currentUsername;
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ display_name: "", bio: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cleanUsername) return;
    
    setLoading(true);
    setError("");

    // Fetch profile
    api.get(`/users/profiles/${cleanUsername}/`)
      .then((data: UserProfile) => {
        setProfile(data);
        setEditData({ 
          display_name: data.display_name || "", 
          bio: data.bio || "" 
        });
      })
      .catch(() => setError("User not found."));

    // Fetch user's recipes
    api.get(`/recipes/?author=${cleanUsername}`)
      .then((data: any) => setRecipes(data.results ?? data))
      .catch(() => {});

    setLoading(false);
  }, [cleanUsername]);

  const handleSave = async () => {
    if (!token || !isOwnProfile) return;
    setSaving(true);
    try {
      const updated = await api.patch("/users/profiles/me/", editData, token);
      setProfile(prev => prev ? { ...prev, ...updated } : null);
      setIsEditing(false);
    } catch {
      setError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token || !isOwnProfile) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const updated = await api.patch("/users/profiles/me/", formData, token);
      setProfile(prev => prev ? { ...prev, ...updated } : null);
    } catch {
      setError("Failed to upload avatar.");
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto py-12 text-center">Loading profile...</div>;
  if (error) return <div className="max-w-4xl mx-auto py-12 text-center text-destructive">{error}</div>;
  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Header */}
      <Card className="overflow-hidden border-none shadow-md bg-white">
        <div className="h-32 bg-gradient-to-r from-saffron-100 to-amber-50" />
        <CardContent className="relative pt-0 px-6 pb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="relative -mt-12 group">
              <div className="size-24 sm:size-32 rounded-3xl border-4 border-white overflow-hidden bg-muted shadow-lg">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-300">
                    <UserIcon className="size-12 sm:size-16" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                  <Camera className="size-6" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 pt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {isEditing ? (
                      <Input 
                        value={editData.display_name} 
                        onChange={e => setEditData(prev => ({ ...prev, display_name: e.target.value }))}
                        placeholder="Display Name"
                        className="text-2xl font-bold h-10 px-2 -ml-2"
                      />
                    ) : (
                      profile.display_name || `@${profile.username}`
                    )}
                  </h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
                
                {isOwnProfile && (
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="rounded-full">
                          <X className="size-4 mr-1" /> Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={saving} className="rounded-full bg-saffron hover:bg-saffron-dark text-white border-0">
                          <Check className="size-4 mr-1" /> {saving ? "Saving..." : "Save"}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="rounded-full">
                        <Edit2 className="size-4 mr-1" /> Edit Profile
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-4">
                {isEditing ? (
                  <Textarea 
                    value={editData.bio}
                    onChange={e => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Tell the world about your kitchen..."
                    className="resize-none"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
                    {profile.bio || "No bio yet. Cooking up something good!"}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                  <div className="flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    Joined {new Date(profile.date_joined).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-foreground font-bold">{recipes.length}</span> Published Recipes
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Recipes */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">
            {isOwnProfile ? "My Published Recipes" : "Recipes"}
          </h2>
          {isOwnProfile && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link to="/kitchen">View all drafts →</Link>
            </Button>
          )}
        </div>

        {recipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.slug} recipe={recipe} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed py-12">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-3">
              <div className="size-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xl">🍳</div>
              <div>
                <p className="font-medium text-muted-foreground">No recipes published yet.</p>
                {isOwnProfile && (
                  <Button variant="link" asChild className="mt-1">
                    <Link to="/recipes/new">Create your first recipe →</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
