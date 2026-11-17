import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { firebaseService } from '../../db/firebaseService';
import { useToast } from '../../context/ToastContext';

interface PhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  value,
  onChange,
  folder = 'profiles',
  label = 'Profile Photo',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Invalid File Type', 'Please choose a PNG, JPG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File Too Large', 'Maximum image size is 5MB.');
      return;
    }

    try {
      setIsUploading(true);
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const storagePath = `${folder}/${timestamp}_${sanitizedName}`;

      const downloadUrl = await firebaseService.uploadProfilePhoto(file, storagePath);
      onChange(downloadUrl);
      toast.success('Photo Uploaded', 'Profile photograph saved to Firebase Storage.');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      // Fallback: Read as base64 data URL if storage bucket fails
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
          toast.info('Local Photo Saved', 'Image preview cached successfully.');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 shadow-xs shrink-0">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              title="Remove photo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Uploading to Firebase...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload Image</span>
                </>
              )}
            </button>
            {value && (
              <button
                type="button"
                onClick={handleRemove}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or enter image URL (https://...)"
            className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-blue-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
};
