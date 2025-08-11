import { type FileItem } from "../types";

export class FileService {
  private baseUrl =
    typeof window !== "undefined" && window.location.port === "3000"
      ? "" // Use Vite proxy in development
      : "http://192.168.199.11:8554";

  async getFiles(path: string = "/download"): Promise<FileItem[]> {
    try {
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      const url = this.baseUrl ? `${this.baseUrl}${normalizedPath}${normalizedPath.endsWith("/") ? "" : "/"}` : `/proxy${normalizedPath}${normalizedPath.endsWith("/") ? "" : "/"}`;
      console.log("Fetching URL:", url);

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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const preElement = doc.querySelector("pre");

    if (!preElement) return [];

    const lines = preElement.textContent?.split("\n") || [];
    const files: FileItem[] = [];

    for (const line of lines) {
      // Match lines with href links
      const linkMatch = line.match(/<a href="([^"]+)">([^<]+)<\/a>/);
      if (!linkMatch) continue;

      const [, href, linkText] = linkMatch;

      // Skip parent directory and invalid links
      if (href === "../" || href === ".." || !href || linkText === "..") continue;

      // Extract file info after the link
      const afterLink = line.substring(line.indexOf("</a>") + 4);
      const parts = afterLink
        .trim()
        .split(/\s+/)
        .filter((p) => p);

      let dateText = "";
      let sizeText = "";

      if (parts.length >= 2) {
        dateText = `${parts[0]} ${parts[1]}`;
        sizeText = parts[2] || "";
      }

      const isDirectory = href.endsWith("/");
      const fileName = isDirectory ? linkText.replace("/", "") : linkText;
      const extension = !isDirectory ? fileName.split(".").pop()?.toLowerCase() : undefined;

      files.push({
        name: fileName,
        type: isDirectory ? "directory" : "file",
        size: this.parseFileSize(sizeText),
        modified: dateText || "",
        path: href,
        extension,
      });
    }

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
    return this.baseUrl ? `${this.baseUrl}${basePath}${fileName}` : `/proxy${basePath}${fileName}`;
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
