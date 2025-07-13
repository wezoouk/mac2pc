import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
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
            <CardTitle className="text-3xl font-bold text-center">Terms and Conditions</CardTitle>
            <p className="text-center text-muted-foreground">Last updated: July 13, 2025</p>
          </CardHeader>
          <CardContent className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                By accessing and using Mac2PC ("the Service"), you accept and agree to be bound by the terms 
                and provision of this agreement. Mac2PC is a free peer-to-peer file transfer service that 
                allows users to securely share files between devices on the same network.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mac2PC provides a web-based platform for secure, direct file transfers between devices 
                including Mac, PC, iPhone, iPad, and other compatible devices. The service uses:
              </p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Peer-to-peer technology for direct device connections</li>
                <li>Local network discovery for automatic device detection</li>
                <li>Room-based sharing for cross-network transfers</li>
                <li>End-to-end encryption for secure file transfers</li>
                <li>QR code pairing for easy device connection</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">3. Privacy and Data Protection</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>No Data Storage:</strong> Mac2PC does not store, save, or retain any files transferred 
                through the service. All transfers occur directly between your devices.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>No Account Required:</strong> The service does not require user registration or 
                account creation. Device identification is temporary and session-based.
              </p>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                <strong>Local Processing:</strong> File transfers happen directly between your devices 
                without routing through our servers.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">4. Acceptable Use Policy</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">You agree not to use Mac2PC for:</p>
              <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 mb-4">
                <li>Transferring illegal, harmful, or copyrighted content without permission</li>
                <li>Sharing malware, viruses, or other malicious software</li>
                <li>Attempting to hack, disrupt, or gain unauthorized access to the service</li>
                <li>Violating any applicable laws or regulations</li>
                <li>Interfering with other users' ability to use the service</li>
              </ul>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">5. Disclaimer of Warranties</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mac2PC is provided "as is" without any warranties, express or implied. We do not guarantee 
                the service will be uninterrupted, secure, or error-free. Users are responsible for backing 
                up their own data and verifying the safety of files they transfer.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mac2PC and its operators shall not be liable for any direct, indirect, incidental, special, 
                consequential, or punitive damages resulting from your use of the service, including but not 
                limited to data loss, system damage, or security breaches.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">7. Advertising</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Mac2PC may display advertisements to support the free service. These ads are provided by 
                third-party networks and are subject to their own terms and privacy policies.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">8. Modifications to Terms</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                We reserve the right to modify these terms at any time. Continued use of the service after 
                changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-6">
              <h2 className="text-xl font-semibold mb-3">9. Contact Information</h2>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                For questions about these terms or the service, please contact us through the feedback 
                option available on the main application.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}