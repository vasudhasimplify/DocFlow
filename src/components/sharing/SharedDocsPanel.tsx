import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Eye,
    Edit,
    Mail,
    ExternalLink,
    Users,
    Download,
    FileText
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { generateShareUrl } from '@/types/shareLink';

/**
 * SharedDocsPanel - Shows documents shared by/with the user via Guest Sharing and E-Signatures
 * This is SEPARATE from ShareLinksDashboard (which manages Share Links)
 */
export function SharedDocsPanel() {
    return (
        <div className="space-y-6">
            <Tabs defaultValue="by-me" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="by-me" className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Shared by me
                    </TabsTrigger>
                    <TabsTrigger value="with-me" className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Shared with me
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="by-me">
                    <SharedByMePanel />
                </TabsContent>

                <TabsContent value="with-me">
                    <SharedWithMePanel />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// Documents shared BY the current user (via Guest Sharing or E-Signature)
function SharedByMePanel() {
    const [shares, setShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShares = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const allShares: any[] = [];

                // 1. Fetch Guest Shares (external_shares)
                const { data: guestShares } = await supabase
                    .from('external_shares')
                    .select('*')
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false });

                if (guestShares) {
                    guestShares.forEach(share => {
                        allShares.push({
                            id: share.id,
                            type: 'guest',
                            documentName: share.resource_name || 'Document',
                            recipientEmail: share.guest_email,
                            permission: share.permission,
                            status: share.status,
                            viewCount: share.view_count || 0,
                            createdAt: share.created_at,
                            token: share.invitation_token
                        });
                    });
                }

                // 2. Fetch E-Signature Requests
                try {
                    const { data: signatureRequests } = await supabase
                        .from('signature_requests')
                        .select('*, signature_signers(*)')
                        .eq('requester_id', user.id)
                        .order('created_at', { ascending: false });

                    if (signatureRequests) {
                        signatureRequests.forEach((req: any) => {
                            const signers = req.signature_signers || [];
                            const signerEmails = signers.map((s: any) => s.email).join(', ');
                            allShares.push({
                                id: req.id,
                                type: 'signature',
                                documentName: req.title || req.document_name || 'Document',
                                recipientEmail: signerEmails || 'No signers',
                                permission: 'sign',
                                status: req.status,
                                viewCount: 0,
                                createdAt: req.created_at,
                                token: null
                            });
                        });
                    }
                } catch (err) {
                    console.log('Signature requests table may not exist:', err);
                }

                // Sort by createdAt
                allShares.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                setShares(allShares);
            } catch (err) {
                console.error('Failed to fetch shares:', err);
                setShares([]);
            } finally {
                setLoading(false);
            }
        };

        fetchShares();
    }, []);

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'guest':
                return <Badge className="bg-blue-500 text-white">Guest Share</Badge>;
            case 'signature':
                return <Badge className="bg-purple-500 text-white">E-Signature</Badge>;
            default:
                return <Badge variant="secondary">Share</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
            case 'accepted':
            case 'completed':
                return <Badge variant="outline" className="text-green-600 border-green-600">Completed</Badge>;
            case 'expired':
                return <Badge variant="outline" className="text-gray-600 border-gray-600">Expired</Badge>;
            case 'revoked':
            case 'cancelled':
                return <Badge variant="outline" className="text-red-600 border-red-600">Cancelled</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) return <div className="text-center py-8">Loading...</div>;

    if (shares.length === 0) {
        return (
            <Card>
                <CardContent className="text-center text-muted-foreground py-12">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium">No documents shared yet</p>
                    <p className="text-sm mt-1">Documents you share via Guest Sharing or E-Signature will appear here</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Documents Shared by Me
                </CardTitle>
                <CardDescription>Documents shared via Guest Sharing or E-Signature requests</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {shares.map(share => (
                            <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded ${share.type === 'signature' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {share.type === 'signature' ? <Edit className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{share.documentName}</p>
                                            {getTypeBadge(share.type)}
                                            {getStatusBadge(share.status)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            To: {share.recipientEmail} • {formatDistanceToNow(new Date(share.createdAt), { addSuffix: true })}
                                            {share.viewCount > 0 && ` • ${share.viewCount} views`}
                                        </p>
                                    </div>
                                </div>
                                {share.token && (
                                    <Button variant="outline" size="sm" onClick={() => window.open(generateShareUrl(share.token), '_blank')}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// Documents shared WITH the current user
function SharedWithMePanel() {
    const [shares, setShares] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSharedWithMe = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }

                const response = await fetch('/api/shares/shared-with-me', {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) {
                        setShares(data);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch shared with me:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSharedWithMe();
    }, []);

    if (loading) return <div className="text-center py-8">Loading...</div>;

    if (shares.length === 0) {
        return (
            <Card>
                <CardContent className="text-center text-muted-foreground py-12">
                    <Download className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-medium">No documents shared with you yet</p>
                    <p className="text-sm mt-1">Documents others share with you will appear here</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Shared With Me</CardTitle>
                <CardDescription>Documents others have shared with you</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                        {shares.map(share => {
                            const isDirectShare = share.invitation_token?.startsWith('direct-');
                            const shareType = isDirectShare ? 'Direct Share' : 'Guest Share';

                            const handleOpen = () => {
                                if (isDirectShare) {
                                    window.location.href = `/documents?doc=${share.resource_id}`;
                                } else {
                                    window.open(generateShareUrl(share.invitation_token), '_blank');
                                }
                            };

                            return (
                                <div key={share.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded ${isDirectShare ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {share.permission === 'view' ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{share.resource_name || 'Untitled'}</p>
                                                <Badge variant="secondary" className={isDirectShare ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                                                    {shareType}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {share.owner_email ? `From: ${share.owner_email}` : 'From: SimplifyDrive User'} • {formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleOpen}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        View
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
