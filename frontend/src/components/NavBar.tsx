import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-tight">
        🥄 Spoonfury
      </Link>
      <div className="flex items-center gap-3">
        {username ? (
          <>
            <span className="text-sm text-muted-foreground">@{username}</span>
            <Link to="/books">
              <Button variant="outline" size="sm">My Books</Button>
            </Link>
            <Link to="/recipes/new">
              <Button size="sm">+ Recipe</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link to="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Join</Button></Link>
          </>
        )}
      </div>
    </nav>
  );
}
