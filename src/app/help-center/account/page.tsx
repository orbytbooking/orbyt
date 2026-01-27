import { Button } from "@/components/ui/button";
import { ChevronRight, Key, Mail, User, Lock, Bell, CreditCard, Shield } from "lucide-react";
import Link from "next/link";

export default function AccountSupportPage() {
  const accountTopics: Array<{
    icon: React.ReactNode;
    title: string;
    description: string;
    link?: string;
    isExpandable?: boolean;
    content?: React.ReactNode;
  }> = [
    {
      icon: <User className="h-5 w-5" />,
      title: "Update Profile Information",
      description: "Change your name, email, phone number, and other personal details.",
      isExpandable: true,
      content: (
        <div className="mt-4 space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Follow these steps to update your profile information:
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold">1</div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Go to Your Profile</h4>
                <p className="text-sm text-gray-500 mt-1">Click on your profile picture in the top right corner and select 'My Profile' from the dropdown menu.</p>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img 
                    src="/images/profile-dropdown-example.png" 
                    alt="Profile dropdown menu"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold">2</div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Edit Your Information</h4>
                <p className="text-sm text-gray-500 mt-1">Click the 'Edit Profile' button to make changes to your personal information.</p>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img 
                    src="/images/edit-profile-example.png" 
                    alt="Edit profile interface"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 text-blue-600 font-bold">3</div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Save Your Changes</h4>
                <p className="text-sm text-gray-500 mt-1">After making your updates, click 'Save Changes' to update your profile information.</p>
                <div className="mt-2 border rounded-lg overflow-hidden">
                  <img 
                    src="/images/save-changes-example.png" 
                    alt="Save changes button"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Important Note</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>• Some changes may require verification via email or phone number.</p>
                  <p>• Your profile picture can be updated by clicking on the current picture.</p>
                  <p>• Required fields are marked with an asterisk (*).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },,
    {
      icon: <Key className="h-5 w-5" />,
      title: "Change Password",
      description: "Update your account password or reset it if you've forgotten it.",
      isExpandable: true,
      content: (
        <div className="mt-4 space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  You can update your password in the Security section of your account settings.
                </p>
              </div>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <img 
              src="/images/change-password.png" 
              alt="Change password interface"
              className="w-full h-auto"
            />
            <div className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600">Navigate to: <span className="font-medium">Account Settings</span> → <span className="font-medium">Security</span> → <span className="font-medium">Change Password</span></p>
            </div>
          </div>
        </div>
      )
    },,
    {
      icon: <Bell className="h-5 w-5" />,
      title: "Notification Preferences",
      description: "Manage how and when you receive notifications about your appointments.",
      isExpandable: true,
      content: (
        <div className="mt-4 space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Manage your notification preferences in the Notifications section.
                </p>
              </div>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <img 
              src="/images/notification-settings.png" 
              alt="Notification settings interface"
              className="w-full h-auto"
            />
            <div className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600">Navigate to: <span className="font-medium">Account Settings</span> → <span className="font-medium">Notifications</span></p>
            </div>
          </div>
        </div>
      )
    },,
    {
      icon: <CreditCard className="h-5 w-5" />,
      title: "Payment Methods",
      description: "Add, update, or remove your saved payment methods.",
      isExpandable: true,
      content: (
        <div className="mt-4 space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  Manage your payment methods in the Billing section.
                </p>
              </div>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <img 
              src="/images/payment-methods.png" 
              alt="Payment methods interface"
              className="w-full h-auto"
            />
            <div className="p-4 bg-gray-50">
              <p className="text-sm text-gray-600">Navigate to: <span className="font-medium">Account Settings</span> → <span className="font-medium">Billing</span> → <span className="font-medium">Payment Methods</span></p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const commonIssues = [
    "I can't log in to my account",
    "I'm not receiving password reset emails",
    "My account was hacked or compromised",
    "I want to delete my account",
    "I need to update my email address"
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Account Support</h1>
          <p className="text-xl text-gray-600">Manage your account settings and get help with account-related issues.</p>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Account Settings</h2>
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {accountTopics.map((topic, index) => (
                <li key={index} className="hover:bg-gray-50 relative">
                  {topic.link ? (
                    <Link href={topic.link} className="block">
                      <div className="flex items-center px-6 py-5">
                        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                          {topic.icon}
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-base font-medium text-gray-900">{topic.title}</h3>
                          <p className="text-sm text-gray-500">{topic.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </Link>
                  ) : (
                    <div className="px-6 py-5">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                          {topic.icon}
                        </div>
                        <div className="ml-4 flex-1">
                          <h3 className="text-base font-medium text-gray-900">{topic.title}</h3>
                          <p className="text-sm text-gray-500">{topic.description}</p>
                          {topic.isExpandable && (
                            <div className="mt-3">
                              <details>
                                <summary className="text-sm font-medium text-primary cursor-pointer hover:underline">
                                  View instructions
                                </summary>
                                {topic.content}
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Common Account Issues</h2>
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {commonIssues.map((issue, index) => (
                <li key={index} className="px-6 py-4 hover:bg-gray-50">
                  <button className="w-full text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-gray-900">{issue}</span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Still need help?</h3>
          <p className="mt-2 text-gray-600">Our support team is ready to assist you with any account-related questions.</p>
          <div className="mt-6">
            <Button asChild variant="outline" className="mr-4">
              <Link href="/help-center/faqs" className="inline-flex items-center">
                Visit Help Center
              </Link>
            </Button>
            <Button asChild>
              <Link href="/contact-support" className="inline-flex items-center">
                Contact Support
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
