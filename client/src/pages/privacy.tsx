import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Mac2PC
            </Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Privacy Policy</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: July 13, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                <h3 className="font-semibold text-lg">No Data Storage</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Files never touch our servers
                </p>
              </div>
              <div className="text-center">
                <Lock className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-lg">Direct Transfer</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Peer-to-peer encrypted connections
                </p>
              </div>
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-3 text-purple-600" />
                <h3 className="font-semibold text-lg">No Tracking</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No accounts or personal data required
                </p>
              </div>
            </div>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Device Information:</strong> Mac2PC temporarily stores device names and connection 
                status in memory to facilitate file transfers. This information is deleted when you close 
                the application.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>No Personal Data:</strong> We do not collect, store, or process any personal 
                information, user accounts, or file contents.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Technical Data:</strong> Standard web server logs may temporarily record IP addresses 
                and browser information for technical operation and security purposes.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">2. How We Use Information</h2>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Enable device discovery and connection on your local network</li>
                <li>Facilitate secure peer-to-peer file transfers</li>
                <li>Provide room-based sharing functionality</li>
                <li>Maintain service security and prevent abuse</li>
                <li>Display relevant advertisements to support the free service</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">3. Data Security</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>End-to-End Encryption:</strong> All file transfers use WebRTC technology with 
                built-in encryption, ensuring your data remains secure during transmission.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>No Server Storage:</strong> Files are transferred directly between your devices 
                without being stored on our servers.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Local Processing:</strong> All file processing happens on your devices, not our servers.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">4. Third-Party Services</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Google AdSense:</strong> We use Google AdSense to display advertisements. Google 
                may use cookies and other tracking technologies. You can learn more about Google's privacy 
                practices at <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline">
                https://policies.google.com/privacy</a>.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Ad Controls:</strong> You can disable advertisements using the toggle in the 
                application settings.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Session Data:</strong> Device information is stored only in memory during your 
                session and is automatically deleted when you close the application.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>No Persistent Storage:</strong> We do not maintain any persistent user data or 
                file history.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Since we don't collect personal data, there's no personal information to access, modify, 
                or delete. You maintain full control over your files and data at all times.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mac2PC does not knowingly collect any information from children under 13. The service 
                is designed to be privacy-friendly for users of all ages.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">8. Changes to Privacy Policy</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We may update this privacy policy from time to time. We will notify users of any 
                material changes by updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                If you have any questions about this privacy policy or our privacy practices, please 
                contact us through the feedback option available on the main application.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}