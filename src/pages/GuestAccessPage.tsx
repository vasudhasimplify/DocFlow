import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, Download, AlertCircle, Clock, Eye, ExternalLink, X, Lock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  getShareLinkByToken,
  incrementShareLinkViewCountByToken,
  incrementDownloadCountByToken,
  isShareLinkValid,
  loadShareLinksFromStorage,
  saveShareLinksToStorage
} from '@/utils/shareLinkStorage';
import { EnhancedShareLink } from '@/types/shareLink';
import { useToast } from '@/hooks/use-toast';

interface ShareData {
  id: string;
  resource_id: string;
  resource_name: string;
  resource_type: string;
  status: string;
  permission: string;
  allow_download: boolean;
  expires_at?: string;
  download_url?: string;
  use_count?: number;
  password_protected?: boolean;
  password_hash?: string;
}

interface DocumentData {
  id: string;
  file_name: string;
  storage_path?: string;
  file_type?: string;
  extracted_text?: string;
}

export default function GuestAccessPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [share, setShare] = useState<ShareData | EnhancedShareLink | null>(null);
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  // Password protection state
  const [isLocked, setIsLocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchShare = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // First, check localStorage for the share link
      const localShare = getShareLinkByToken(token);

      if (localShare) {
        // Validate the share link
        const validation = isShareLinkValid(localShare);
        if (!validation.valid) {
          setError(validation.reason || 'Invalid share link');
          setLoading(false);
          return;
        }

        // Handle password protection
        if (localShare.password_protected) {
          setIsLocked(true);
          setShare(localShare);
          setLoading(false);
          return;
        }

        // Record the view and update count
        if (!viewRecorded) {
          incrementShareLinkViewCountByToken(token);
          setViewRecorded(true);
          // Update the local view count
          setViewCount(localShare.use_count + 1);
        } else {
          setViewCount(localShare.use_count);
        }

        setShare(localShare);

        // Fetch the actual document data from Supabase using direct method (for share links)
        await fetchDocumentDirect(localShare.resource_id);

        setLoading(false);
        return;
      }

      // If not found locally, try the database
      try {
        const { data, error: dbError } = await supabase
          .from('external_shares')
          .select('*')
          .eq('invitation_token', token)
          .single();

        if (dbError || !data) {
          // Also try by token field
          const { data: tokenData, error: tokenError } = await supabase
            .from('external_shares')
            .select('*')
            .eq('token', token)
            .single();

          if (tokenError || !tokenData) {
            setError('Invalid or expired share link');
            setLoading(false);
            return;
          }

          // Found by token field
          if (tokenData.status === 'revoked' || !tokenData.is_active) {
            setError('This share has been revoked');
            setLoading(false);
            return;
          }
          if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
            setError('This share link has expired');
            setLoading(false);
            return;
          }

          // Handle password protection for DB link
          if (tokenData.password_protected) {
            setIsLocked(true);
            setShare(tokenData);
            setLoading(false);
            return;
          }

          setShare(tokenData);
          setViewCount(tokenData.use_count || 0);
          await fetchDocumentFromBackend();
          // Track view via API
          fetch(`/api/shares/${tokenData.id}/view`, { method: 'POST' }).catch(() => { });
          setLoading(false);
          return;
        }

        if (data.status === 'revoked') {
          setError('This share has been revoked');
          setLoading(false);
          return;
        }
        if (data.status === 'expired' || (data.expires_at && new Date(data.expires_at) < new Date())) {
          setError('This share link has expired');
          setLoading(false);
          return;
        }

        // Handle password protection for DB link
        if (data.password_protected) {
          setIsLocked(true);
          setShare(data);
          setLoading(false);
          return;
        }

        setShare(data);
        setViewCount(data.use_count || 0);
        await fetchDocumentFromBackend();
        // Track view via API
        fetch(`/api/shares/${data.id}/view`, { method: 'POST' }).catch(() => { });
        setLoading(false);
      } catch (err) {
        setError('Failed to load share link');
        setLoading(false);
      }
    };

    fetchShare();
  }, [token, viewRecorded]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!share) return;

    // In a real app, verify hash. Here we compare directly as per plan.
    if (share.password_hash === passwordInput) {
      setIsLocked(false);
      setPasswordError(false);

      // Now that it's unlocked, proceed with view recording and document fetching
      if (!viewRecorded && token) {
        incrementShareLinkViewCountByToken(token);
        setViewRecorded(true);
        setViewCount((share.use_count || 0) + 1);

        // Also track via API if available
        if (share.id && !share.id.startsWith('link-')) {
          fetch(`/api/shares/${share.id}/view`, { method: 'POST' }).catch(() => { });
        }
      } else {
        setViewCount(share.use_count || 0);
      }

      await fetchDocumentDirect(share.resource_id);
    } else {
      setPasswordError(true);
      toast({
        title: "Incorrect password",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const fetchDocumentFromBackend = async () => {
    // For external_shares (guest sharing) - use backend API
    try {
      console.log('🔍 Fetching document via backend API with token:', token);

      const response = await fetch(`/api/guest/document/${token}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend API error:', errorData);
        setError(errorData.detail || 'Failed to load document');
        return;
      }

      const data = await response.json();
      console.log('✅ Document data received from backend:', data);

      setDocument({
        id: data.document_id,
        file_name: data.file_name,
        storage_path: null,
        file_type: data.file_type,
        extracted_text: null
      });

      if (data.signed_url) {
        console.log('✅ Signed URL received successfully');
        setDocumentUrl(data.signed_url);
      } else {
        console.error('❌ No signed URL in response');
        setError('Failed to generate document URL');
      }
    } catch (err) {
      console.error('❌ Error fetching document from backend:', err);
      setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const fetchDocumentDirect = async (resourceId: string) => {
    // For localStorage share links - use client-side signed URLs
    try {
      console.log('🔍 Fetching document directly with ID:', resourceId);

      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', resourceId)
        .single();

      if (docError) {
        console.error('❌ Error fetching document:', docError);
        setError('Document not found in database');
        return;
      }

      if (!docData) {
        console.log('⚠️ Document not found');
        return;
      }

      console.log('✅ Document found:', docData);

      const fileName = docData.file_name || docData.original_name || docData.name || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeType = docData.mime_type || docData.file_type || '';
      const documentType = docData.document_type || '';
      const fileType = mimeType || documentType || fileExtension;

      setDocument({
        id: docData.id,
        file_name: fileName,
        storage_path: docData.storage_path,
        file_type: fileType,
        extracted_text: docData.extracted_text
      });

      // Get storage URL if storage_path exists
      if (docData.storage_path) {
        console.log('🔐 Creating signed URL for storage_path:', docData.storage_path);

        const { data: urlData, error: urlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(docData.storage_path, 3600);

        if (urlError) {
          console.error('❌ Error creating signed URL:', urlError);
          setError('Failed to generate document URL');
          return;
        }

        if (urlData?.signedUrl) {
          console.log('✅ Signed URL created successfully');
          setDocumentUrl(urlData.signedUrl);
        }
      } else {
        console.error('❌ No storage_path found');
        setError('Document file not found in storage');
      }
    } catch (err) {
      console.error('❌ Error fetching document directly:', err);
      setError(`Failed to load document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Helper function to determine if file is previewable and what type
  const getPreviewType = (fileType: string | undefined, fileName: string | undefined): 'pdf' | 'image' | 'text' | 'none' => {
    if (!fileType && !fileName) return 'none';

    const type = (fileType || '').toLowerCase();
    const name = (fileName || '').toLowerCase();
    const extension = name.split('.').pop() || '';

    // Check for PDF
    if (type.includes('pdf') || extension === 'pdf') {
      return 'pdf';
    }

    // Check for images
    if (type.includes('image') ||
      ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }

    // Check for text-based documents
    if (type.includes('text') ||
      ['txt', 'md', 'csv', 'json', 'xml', 'html', 'css', 'js'].includes(extension)) {
      return 'text';
    }

    return 'none';
  };

  const handleViewDocument = () => {
    console.log('🔘 View Document clicked. documentUrl:', documentUrl);

    if (documentUrl) {
      // Open document in new tab or show in viewer
      setShowViewer(true);
    } else {
      // If no URL, show error with more context
      if (error) {
        alert(`Unable to display document: ${error}`);
      } else {
        alert('Document preview is being prepared. Please try again in a moment.\n\nIf this persists, the document may not be properly uploaded to storage.');
      }
    }
  };

  const handleDownload = async () => {
    if (!share || !token) return;

    setDownloading(true);

    try {
      if (documentUrl) {
        // Track the download
        incrementDownloadCountByToken(token);

        // Download from the signed URL
        const response = await fetch(documentUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document?.file_name || 'document';
        window.document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        window.document.body.removeChild(a);
      } else {
        alert('Download will be available once the document is fully loaded.');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download the document. Please try again.');
    }

    setDownloading(false);
  };

  const getPermissionLabel = (permission: string) => {
    switch (permission) {
      case 'view': return 'View Only';
      case 'comment': return 'Can Comment';
      case 'download': return 'Can Download';
      case 'edit': return 'Can Edit';
      default: return permission;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800/50 border-gray-700">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!share) return null;

  // Password Challenge UI
  if (isLocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-gray-800/50 border-gray-700 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 bg-blue-500/20 rounded-full w-fit mb-4">
              <Lock className="h-8 w-8 text-blue-400" />
            </div>
            <CardTitle className="text-xl text-white">Password Protected</CardTitle>
            <CardDescription className="text-gray-400">
              This document is protected with a password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Enter Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`bg-gray-900/50 border-gray-600 text-white ${passwordError ? 'border-red-500 ring-1 ring-red-500/50' : ''}`}
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-red-400">Incorrect password</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Unlock Document
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center border-t border-gray-700 pt-6">
            <p className="text-xs text-gray-500">
              DocFlow Secure Sharing
            </p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const resourceName = 'resource_name' in share ? share.resource_name : 'Shared Document';
  const permission = 'permission' in share ? share.permission : 'view';
  const allowDownload = 'allow_download' in share ? share.allow_download : false;
  const expiresAt = 'expires_at' in share ? share.expires_at : undefined;

  // Show document viewer
  if (showViewer && documentUrl) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">{resourceName}</span>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
              {getPermissionLabel(permission)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {(allowDownload || permission === 'download') && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownload}
                disabled={downloading}
                className="border-gray-600 text-gray-300 download-btn"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowViewer(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Document Viewer */}
        <div className="flex-1 p-4">
          {(() => {
            const previewType = getPreviewType(document?.file_type, document?.file_name);

            if (previewType === 'pdf') {
              return (
                <iframe
                  src={documentUrl}
                  className="w-full h-full min-h-[calc(100vh-80px)] rounded-lg border border-gray-700"
                  title={resourceName}
                />
              );
            } else if (previewType === 'image') {
              return (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={documentUrl}
                    alt={resourceName}
                    className="max-w-full max-h-[calc(100vh-100px)] rounded-lg shadow-xl"
                  />
                </div>
              );
            } else if (previewType === 'text' && document?.extracted_text) {
              return (
                <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 min-h-[calc(100vh-100px)]">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                    {document.extracted_text}
                  </pre>
                </div>
              );
            } else {
              return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <FileText className="h-20 w-20 text-gray-600 mb-4" />
                  <p className="text-gray-400 mb-2">Preview not available for this file type</p>
                  <p className="text-gray-500 text-sm mb-4">
                    File: {document?.file_name || 'Unknown'}
                    {document?.file_type && <span> ({document.file_type})</span>}
                  </p>
                  {(allowDownload || permission === 'download') && (
                    <Button onClick={handleDownload} disabled={downloading}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  )}
                </div>
              );
            }
          })()}
        </div>
      </div>
    );
  }

  // Main share info page
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-gray-800/50 border-gray-700 backdrop-blur">
        <CardHeader className="text-center border-b border-gray-700">
          <div className="mx-auto p-4 bg-blue-500/20 rounded-full w-fit mb-4">
            <FileText className="h-10 w-10 text-blue-400" />
          </div>
          <CardTitle className="text-2xl text-white">{resourceName}</CardTitle>
          <CardDescription className="text-gray-400">
            You have been granted guest access to this document
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Permission Badge */}
          <div className="flex items-center justify-center gap-3">
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 px-3 py-1">
              <Eye className="w-3 h-3 mr-1" />
              {getPermissionLabel(permission)}
            </Badge>
            {expiresAt && (
              <Badge variant="outline" className="text-gray-400 border-gray-600">
                <Clock className="w-3 h-3 mr-1" />
                Expires {new Date(expiresAt).toLocaleDateString()}
              </Badge>
            )}
          </div>

          {/* View Count */}
          <div className="text-center text-sm text-gray-500">
            This document has been viewed {viewCount} time{viewCount !== 1 ? 's' : ''}
          </div>

          {/* Actions */}
          <div className="flex justify-center gap-4">
            {(allowDownload || permission === 'download') && (
              <Button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {downloading ? 'Downloading...' : 'Download'}
              </Button>
            )}
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
              onClick={handleViewDocument}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Document
            </Button>
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-500">
            Shared via DocFlow • Secure document sharing
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
