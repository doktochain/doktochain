import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, File } from 'lucide-react';

interface DocumentViewerProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  onClose: () => void;
}

export default function DocumentViewer({ fileUrl, fileName, fileType, onClose }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900/90 backdrop-blur-sm border-b border-gray-700">
        <div className="flex items-center gap-3 min-w-0">
          {isImage ? (
            <ImageIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
          ) : isPdf ? (
            <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />
          ) : (
            <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
          )}
          <span className="text-white text-sm font-medium truncate">{fileName}</span>
        </div>
        <div className="flex items-center gap-2">
          {isImage && (
            <>
              <button
                onClick={() => setZoom(z => Math.max(25, z - 25))}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-gray-400 text-xs w-12 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(300, z + 25))}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </>
          )}
          <button
            onClick={handleDownload}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-6">
        {isImage ? (
          <img
            src={fileUrl}
            alt={fileName}
            style={{ width: `${zoom}%`, maxWidth: 'none' }}
            className="object-contain transition-all duration-200"
          />
        ) : isPdf ? (
          <iframe
            src={`${fileUrl}#toolbar=1`}
            className="w-full h-full rounded-lg bg-white"
            title={fileName}
          />
        ) : (
          <div className="text-center">
            <File className="w-20 h-20 text-gray-500 mx-auto mb-4" />
            <p className="text-white text-lg font-medium mb-2">{fileName}</p>
            <p className="text-gray-400 text-sm mb-6">
              This file type cannot be previewed in the browser.
            </p>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="w-5 h-5" />
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
