import { useState, useRef } from "react";
import { Upload, X, FileText, Image, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Device } from "@shared/schema";

interface FileTransferProps {
  selectedDevice: Device | null;
  onFileSend: (files: File[]) => void;
}

export function FileTransfer({ selectedDevice, onFileSend }: FileTransferProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) {
      return <Image className="text-blue-600" size={16} />;
    } else if (file.type.includes('pdf')) {
      return <FileText className="text-red-600" size={16} />;
    } else if (file.type.includes('zip') || file.type.includes('rar')) {
      return <Archive className="text-purple-600" size={16} />;
    }
    return <FileText className="text-slate-600" size={16} />;
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function handleSendFiles() {
    if (selectedFiles.length === 0 || !selectedDevice) return;
    
    onFileSend(selectedFiles);
    setSelectedFiles([]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-semibold">File Transfer</CardTitle>
        <p className="text-sm text-slate-600">Drag files here or click to select</p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <div className="space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Upload className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-slate-900">Drop files here</h3>
              <p className="text-sm text-slate-600">or click to browse</p>
            </div>
            <div className="text-xs text-slate-500">
              Max file size: 100MB • All file types supported
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border">
                    {getFileIcon(file)}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{file.name}</h4>
                    <p className="text-sm text-slate-600">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-slate-400 hover:text-red-600"
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </div>
          <Button
            onClick={handleSendFiles}
            disabled={selectedFiles.length === 0 || !selectedDevice}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Send Files
          </Button>
        </div>

        {!selectedDevice && (
          <p className="text-sm text-amber-600 text-center">
            Select a device to send files
          </p>
        )}
      </CardContent>
    </Card>
  );
}
