import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Users, Mail, UserPlus, Shield, Check, X, Edit2, Lock } from "lucide-react";

export function UserManagementTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", isActive: true });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  // Fetch admin users
  const { data: adminUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  // User management mutations
  const createUserMutation = useMutation({
    mutationFn: async (user: any) => {
      return await apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(user),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User created",
        description: "The admin user has been successfully created.",
      });
      setUserDialogOpen(false);
      setNewUser({ username: "", email: "", password: "", isActive: true });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, ...user }: any) => {
      return await apiRequest(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(user),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "The admin user has been successfully updated.",
      });
      setEditingUser(null);
      setUserDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  const handleUpdateUser = () => {
    if (!editingUser?.username || !editingUser?.email) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    updateUserMutation.mutate(editingUser);
  };

  const openEditDialog = (user: any) => {
    setEditingUser({
      id: user.id,
      username: user.username,
      email: user.email,
      isActive: user.isActive,
    });
    setUserDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setNewUser({ username: "", email: "", password: "", isActive: true });
    setUserDialogOpen(true);
  };

  return (
    <>
      {/* Create New User */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus size={20} />
            <span>Admin User Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-600">Manage admin users who can access this panel</p>
            <Button onClick={openCreateDialog}>
              <UserPlus size={16} className="mr-2" />
              Add New User
            </Button>
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {loadingUsers ? (
              <p className="text-center text-slate-500">Loading users...</p>
            ) : adminUsers.length === 0 ? (
              <p className="text-center text-slate-500">No admin users found</p>
            ) : (
              adminUsers.map((user: any) => (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-slate-600 flex items-center">
                        <Mail size={14} className="mr-1" />
                        {user.email}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? (
                            <><Check size={12} className="mr-1" /> Active</>
                          ) : (
                            <><X size={12} className="mr-1" /> Inactive</>
                          )}
                        </Badge>
                        {user.lastLogin && (
                          <span className="text-xs text-slate-500">
                            Last login: {new Date(user.lastLogin).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(user)}
                  >
                    <Edit2 size={16} className="mr-2" />
                    Edit
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users size={20} />
              <span>{editingUser ? "Edit User" : "Create New User"}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={editingUser ? editingUser.username : newUser.username}
                onChange={(e) =>
                  editingUser
                    ? setEditingUser({ ...editingUser, username: e.target.value })
                    : setNewUser({ ...newUser, username: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                value={editingUser ? editingUser.email : newUser.email}
                onChange={(e) =>
                  editingUser
                    ? setEditingUser({ ...editingUser, email: e.target.value })
                    : setNewUser({ ...newUser, email: e.target.value })
                }
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={editingUser ? editingUser.isActive : newUser.isActive}
                onCheckedChange={(checked) =>
                  editingUser
                    ? setEditingUser({ ...editingUser, isActive: checked })
                    : setNewUser({ ...newUser, isActive: checked })
                }
              />
              <Label htmlFor="isActive">Active user</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingUser ? handleUpdateUser : handleCreateUser}
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {editingUser ? "Update User" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PasswordResetTab() {
  const { toast } = useToast();
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetStep, setResetStep] = useState<'email' | 'token'>('email');
  const [generatedToken, setGeneratedToken] = useState("");

  // Password reset mutations
  const requestResetMutation = useMutation({
    mutationFn: async (email: string) => {
      return await apiRequest("/api/admin/request-reset", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    onSuccess: (data) => {
      if (data.token) {
        setGeneratedToken(data.token);
        setResetStep('token');
        toast({
          title: "Reset token generated",
          description: "Use the token displayed below to reset your password.",
        });
      } else {
        toast({
          title: "Reset request sent",
          description: "If the email exists, a reset token has been generated.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process reset request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      return await apiRequest("/api/admin/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been successfully reset.",
      });
      setResetEmail("");
      setResetToken("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setResetStep('email');
      setGeneratedToken("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRequestReset = () => {
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    requestResetMutation.mutate(resetEmail);
  };

  const handleResetPassword = () => {
    if (!resetToken || !resetNewPassword) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate({ token: resetToken, newPassword: resetNewPassword });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lock size={20} />
          <span>Password Reset</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {resetStep === 'email' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email Address</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="Enter your email address"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={handleRequestReset}
              disabled={requestResetMutation.isPending}
              className="w-full"
            >
              {requestResetMutation.isPending ? "Generating Token..." : "Generate Reset Token"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedToken && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 mb-2">Your reset token:</p>
                <code className="text-sm bg-white px-2 py-1 rounded border text-yellow-900 break-all">
                  {generatedToken}
                </code>
                <p className="text-xs text-yellow-700 mt-2">
                  Copy this token and paste it in the field below. It expires in 1 hour.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="resetToken">Reset Token</Label>
              <Input
                id="resetToken"
                placeholder="Enter reset token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resetNewPassword">New Password</Label>
              <Input
                id="resetNewPassword"
                type="password"
                placeholder="Enter new password"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resetConfirmPassword">Confirm New Password</Label>
              <Input
                id="resetConfirmPassword"
                type="password"
                placeholder="Confirm new password"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setResetStep('email');
                  setResetToken("");
                  setResetNewPassword("");
                  setResetConfirmPassword("");
                  setGeneratedToken("");
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={resetPasswordMutation.isPending}
                className="flex-1"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}