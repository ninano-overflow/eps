import type { Route } from "./+types/home";
import { FileExplorer } from "../components/FileExplorer";

export function meta({}: Route.MetaArgs) {
  return [{ title: "EPS File Explorer" }, { name: "description", content: "Modern file browser for EPS proxy server" }];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        {/* <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            EPS File Explorer
          </h1>
          <p className="text-gray-600 text-lg">
            Browse and download files from your proxy server
          </p>
          <div className="text-sm text-gray-500 mt-2">
            Connected to: <span className="font-mono">192.168.199.11:8554</span>
          </div>
        </div> */}

        {/* File Explorer */}
        <FileExplorer />

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>EPS - Edge Proxy Server File Browser</p>
        </div>
      </div>
    </div>
  );
}
