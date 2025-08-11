import { useState, useEffect } from "react";
import { type FileItem } from "../types";
import { fileService } from "../services/fileService";

interface FileExplorerProps {
  initialPath?: string;
}

export function FileExplorer({ initialPath = "/download" }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadFiles(currentPath);
  }, [currentPath]);

  const loadFiles = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fileService.getFiles(path);
      setFiles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "directory") {
      const newPath = currentPath === "/download" ? `/download/${file.name}` : `${currentPath}/${file.name}`;
      setCurrentPath(newPath);
    } else {
      setSelectedFile(file);
    }
  };

  const handleDownload = async (file: FileItem) => {
    const fileKey = `${currentPath}/${file.name}`;
    
    try {
      setDownloadingFiles(prev => new Set(prev).add(fileKey));
      await fileService.downloadFile(currentPath, file.name);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to opening in new tab if download fails
      const downloadUrl = fileService.getDownloadUrl(currentPath, file.name);
      window.open(downloadUrl, "_blank");
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileKey);
        return newSet;
      });
    }
  };

  const navigateUp = () => {
    if (currentPath === "/download") return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/download";
    setCurrentPath(parentPath);
  };

  const getPathSegments = () => {
    return currentPath.split("/").filter((segment) => segment !== "");
  };

  const navigateToSegment = (index: number) => {
    const segments = getPathSegments();
    const newPath = "/" + segments.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-center">
          <span className="text-red-600 text-xl mr-2">❌</span>
          <div>
            <h3 className="text-red-800 font-semibold">Error Loading Files</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button onClick={() => loadFiles(currentPath)} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header with Breadcrumbs */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📁</span>
            <h1 className="text-xl font-semibold">File Explorer</h1>
          </div>
          <div className="text-sm opacity-90">{files.length} items</div>
        </div>

        {/* Breadcrumbs */}
        <nav className="mt-4 flex items-center space-x-2 text-sm">
          <button onClick={() => setCurrentPath("/download")} className="hover:bg-white/20 px-2 py-1 rounded transition-colors">
            🏠 Home
          </button>
          {getPathSegments()
            .slice(1)
            .map((segment, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-white/70">→</span>
                <button onClick={() => navigateToSegment(index + 1)} className="hover:bg-white/20 px-2 py-1 rounded transition-colors">
                  {segment}
                </button>
              </div>
            ))}
        </nav>
      </div>

      {/* File Grid */}
      <div className="p-6">
        {/* Back Button */}
        {currentPath !== "/download" && (
          <button onClick={navigateUp} className="mb-4 flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
            <span>←</span>
            <span>Back</span>
          </button>
        )}

        {files.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <span className="text-6xl block mb-4">📂</span>
            <p className="text-lg">This folder is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {files.map((file, index) => (
              <div key={index} className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-md group" onClick={() => handleFileClick(file)}>
                <div className="text-center">
                  <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{fileService.getFileIcon(file)}</div>
                  <div className="text-sm font-medium text-gray-900 truncate">{file.name}</div>
                  <div className="text-xs text-gray-500 mt-1">{file.type === "directory" ? "Folder" : fileService.formatFileSize(file.size)}</div>
                  {file.modified && <div className="text-xs text-gray-400 mt-1">{file.modified}</div>}
                </div>

                {/* Download button for files */}
                {file.type === "file" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file);
                    }}
                    disabled={downloadingFiles.has(`${currentPath}/${file.name}`)}
                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded transition-colors opacity-0 group-hover:opacity-100 disabled:bg-gray-400"
                  >
                    {downloadingFiles.has(`${currentPath}/${file.name}`) ? "Downloading..." : "Download"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      {selectedFile && fileService.isVideoFile(selectedFile) && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{selectedFile.name}</h3>
              <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="p-4">
              <video controls autoPlay className="w-full max-h-96" src={fileService.getDownloadUrl(currentPath, selectedFile.name)}>
                Your browser does not support the video tag.
              </video>
              <div className="mt-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">Size: {fileService.formatFileSize(selectedFile.size)}</div>
                <button 
                  onClick={() => handleDownload(selectedFile)} 
                  disabled={downloadingFiles.has(`${currentPath}/${selectedFile.name}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {downloadingFiles.has(`${currentPath}/${selectedFile.name}`) ? "Downloading..." : "Download"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
