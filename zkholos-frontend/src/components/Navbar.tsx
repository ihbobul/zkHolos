import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { UserCircle, Vote, Settings } from "lucide-react";

export function Navbar() {
  const location = useLocation();
  const { address, isAdmin, isVoter, voterInfo, checkAuth, setVoterRole } = useAuthStore();

  const isCurrentPath = (path: string) => location.pathname === path;

  const handleToggleVoterRole = () => {
    if (isVoter) {
      setVoterRole(false);
    } else {
      setVoterRole(true, {
        region: "Kyiv",
        isEligible: true,
      });
    }
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold">zkHolos</Link>
            
            <div className="flex space-x-4">
              <Button
                variant={isCurrentPath("/") ? "default" : "ghost"}
                asChild
              >
                <Link to="/">Home</Link>
              </Button>

              <Button
                variant={isCurrentPath("/elections") ? "default" : "ghost"}
                asChild
              >
                <Link to="/elections">Elections</Link>
              </Button>

              {isAdmin && (
                <Button
                  variant={isCurrentPath("/admin") ? "default" : "ghost"}
                  asChild
                >
                  <Link to="/admin">Admin Panel</Link>
                </Button>
              )}

              {isVoter && (
                <Button
                  variant={isCurrentPath("/my-votes") ? "default" : "ghost"}
                  asChild
                >
                  <Link to="/my-votes">My Votes</Link>
                </Button>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center space-x-2">
                <UserCircle className="h-4 w-4" />
                <span className="hidden md:inline">
                  {isAdmin ? "Admin" : 
                   isVoter ? `Voter (${voterInfo?.region})` : 
                   "Not Registered"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="flex items-center">
                <UserCircle className="mr-2 h-4 w-4" />
                <span className="font-mono text-sm truncate">{address}</span>
              </DropdownMenuItem>
              {isVoter && (
                <DropdownMenuItem className="flex items-center">
                  <Vote className="mr-2 h-4 w-4" />
                  <span>
                    {voterInfo?.isEligible ? "Eligible to Vote" : "Not Eligible"}
                  </span>
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem className="flex items-center" asChild>
                  <Link to="/admin">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Settings</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {!isVoter && !isAdmin && (
                <DropdownMenuItem className="flex items-center" asChild>
                  <Link to="/register">
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Register as Voter</span>
                  </Link>
                </DropdownMenuItem>
              )}
              
              {/* Add testing controls for admin */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center"
                    onClick={handleToggleVoterRole}
                  >
                    <Vote className="mr-2 h-4 w-4" />
                    <span>{isVoter ? "Remove Voter Role" : "Add Voter Role"}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
} 