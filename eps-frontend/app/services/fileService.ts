import { type FileItem } from "../types";

export class FileService {
  private baseUrl = "http://192.168.199.11:8554";
  // typeof window !== "undefined" && window.location.port === "3000"
  //   ? "http://localhost:3001" // Use simple CORS proxy in development
  //   : "http://192.168.199.11:8554";

  async getFiles(path: string = "/download"): Promise<FileItem[]> {
    try {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const url = `${this.baseUrl}${normalizedPath}${normalizedPath.endsWith("/") ? "" : "/"}`;

      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return this.parseDirectoryHTML(html);
    } catch (error) {
      console.error("Error fetching files:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to load files");
    }
  }

  private parseDirectoryHTML(html: string): FileItem[] {
    console.log("Parsing HTML response:", html.substring(0, 500));

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Find all <a> tags directly
    const links = doc.querySelectorAll("a");
    const files: FileItem[] = [];

    console.log("Found links:", links.length);

    links.forEach((link, index) => {
      const href = link.getAttribute("href");
      const linkText = link.textContent?.trim();

      console.log(`Link ${index}: href="${href}", text="${linkText}"`);

      // Skip parent directory, empty links, and invalid ones
      if (!href || !linkText || href === "../" || linkText === ".." || href === "/" || linkText === "") {
        return;
      }

      // Skip if it looks like a relative path back
      if (href.startsWith("..")) {
        return;
      }

      const isDirectory = href.endsWith("/");
      const fileName = isDirectory ? linkText.replace("/", "") : linkText;
      const extension = !isDirectory ? fileName.split(".").pop()?.toLowerCase() : undefined;

      // Try to get file info from the text content around the link
      const parentElement = link.parentElement;
      let dateText = "";
      let sizeText = "";

      if (parentElement) {
        const fullText = parentElement.textContent || "";
        const afterLinkIndex = fullText.indexOf(linkText) + linkText.length;
        const afterLinkText = fullText.substring(afterLinkIndex);

        // Extract date and size info (typical format: "01-Jan-1980 00:00     32K")
        const match = afterLinkText.match(/(\d{2}-\w{3}-\d{4}\s+\d{2}:\d{2})\s+(\d+\w?)/);
        if (match) {
          dateText = match[1];
          sizeText = match[2];
        }
      }

      const fileItem: FileItem = {
        name: fileName,
        type: isDirectory ? "directory" : "file",
        size: this.parseFileSize(sizeText),
        modified: dateText,
        path: href,
        extension,
      };

      console.log("Parsed file:", fileItem);
      files.push(fileItem);
    });

    console.log("Total parsed files:", files.length);

    return files.sort((a, b) => {
      // Directories first
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      // Then alphabetical
      return a.name.localeCompare(b.name);
    });
  }

  private parseFileSize(sizeText: string): number {
    if (!sizeText || sizeText === "-") return 0;

    const match = sizeText.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    const multipliers: Record<string, number> = {
      "": 1,
      K: 1024,
      M: 1024 ** 2,
      G: 1024 ** 3,
      T: 1024 ** 4,
    };

    return Math.round(value * (multipliers[unit] || 1));
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }

  getDownloadUrl(currentPath: string, fileName: string): string {
    const basePath = currentPath.endsWith("/") ? currentPath : `${currentPath}/`;
    return `${this.baseUrl}${basePath}${fileName}`;
  }

  async downloadFile(currentPath: string, fileName: string): Promise<void> {
    try {
      const url = this.getDownloadUrl(currentPath, fileName);
      console.log("Downloading file from:", url);

      // Fetch the file as a blob
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a temporary anchor element for download
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);

      console.log("File download initiated:", fileName);
    } catch (error) {
      console.error("Download error:", error);
      throw new Error(`Failed to download ${fileName}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  getFileIcon(file: FileItem): string {
    if (file.type === "directory") return "📁";

    const ext = file.extension;
    if (!ext) return "📄";

    // Video files
    if (["mp4", "avi", "mkv", "mov", "wmv", "flv"].includes(ext)) return "🎬";

    // Image files
    if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext)) return "🖼️";

    // Audio files
    if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) return "🎵";

    // Document files
    if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) return "📄";

    // Archive files
    if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "📦";

    return "📄";
  }

  isVideoFile(file: FileItem): boolean {
    const videoExtensions = ["mp4", "avi", "mkv", "mov", "wmv", "flv"];
    return file.extension ? videoExtensions.includes(file.extension) : false;
  }
}

export const fileService = new FileService();
