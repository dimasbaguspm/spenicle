import { createFileRoute } from '@tanstack/react-router';
import { Camera } from 'lucide-react';
import { useState } from 'react';

import { PageLayout, TextInput, Button, Avatar, Tile } from '../../../../components';

export const Route = createFileRoute('/_protected/_experienced-user/settings/profile')({
  component: ProfileComponent,
});

function ProfileComponent() {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    bio: 'Financial enthusiast who loves tracking expenses and optimizing budgets.',
  });

  const handleSave = () => {
    // Handle save logic here
    setIsEditing(false);
    // Show success notification
    alert('Profile updated successfully!');
  };

  const handleCancel = () => {
    // Reset to original data if needed
    setIsEditing(false);
  };

  return (
    <PageLayout background="cream" title="Profile Information" showBackButton={true}>
      <div className="space-y-6">
        {/* Profile Photo Section */}
        <Tile>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Photo</h3>

            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar size="2xl" src="https://picsum.photos/128/128" />
                <button className="absolute -bottom-2 -right-2 bg-coral-500 hover:bg-coral-600 text-white rounded-full p-2 shadow-lg transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1">
                <h4 className="font-medium text-slate-900 mb-2">Change your photo</h4>
                <p className="text-sm text-slate-600 mb-4">
                  Upload a new profile picture. For best results, use a square image at least 200x200 pixels.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm">
                    Upload Photo
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Tile>{' '}
        {/* Personal Information */}
        <Tile>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
                  <TextInput
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
                  <TextInput
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                <TextInput
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  disabled={!isEditing}
                  helperText={isEditing ? 'Changing your email will require verification' : undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                <TextInput
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bio</label>
                <TextInput
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  disabled={!isEditing}
                  helperText="Tell us a bit about yourself (optional)"
                />
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button variant="coral" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        </Tile>
        {/* Account Details */}
        <Tile>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Details</h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Member since</p>
                  <p className="text-sm text-slate-500">When you joined SpendLess</p>
                </div>
                <p className="text-slate-700 font-medium">January 15, 2024</p>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Account ID</p>
                  <p className="text-sm text-slate-500">Your unique account identifier</p>
                </div>
                <p className="text-slate-700 font-mono text-sm">USR-2024-0001</p>
              </div>

              <div className="flex justify-between items-center py-3">
                <div>
                  <p className="font-medium text-slate-900">Account Status</p>
                  <p className="text-sm text-slate-500">Current status of your account</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </div>
        </Tile>
      </div>
    </PageLayout>
  );
}
