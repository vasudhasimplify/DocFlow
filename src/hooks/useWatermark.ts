import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type WatermarkPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'tile';
export type WatermarkType = 'text' | 'image' | 'pattern';

export interface WatermarkSettings {
  id: string;
  document_id: string | null;
  user_id: string;
  name: string;
  is_default: boolean;
  watermark_type: WatermarkType;
  text_content: string | null;
  font_family: string;
  font_size: number;
  text_color: string;
  rotation: number;
  opacity: number;
  position: WatermarkPosition;
  image_url: string | null;
  include_date: boolean;
  include_username: boolean;
  created_at: string;
  updated_at: string;
  document?: {
    file_name: string;
  };
}

export function useWatermark() {
  const [watermarks, setWatermarks] = useState<WatermarkSettings[]>([]);
  const [defaultWatermark, setDefaultWatermark] = useState<WatermarkSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchWatermarks = useCallback(async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await (supabase
        .from('document_watermarks')
        .select(`
          *,
          document:documents(file_name)
        `)
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;

      const allWatermarks = (data || []) as WatermarkSettings[];
      setWatermarks(allWatermarks);
      setDefaultWatermark(allWatermarks.find(w => w.is_default) || null);
    } catch (error) {
      console.error('Error fetching watermarks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatermarks();
  }, [fetchWatermarks]);

  const createWatermark = useCallback(async (
    settings: Omit<WatermarkSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (settings.is_default) {
        await supabase
          .from('document_watermarks')
          .update({ is_default: false })
          .eq('user_id', user.user.id);
      }

      const { data, error } = await supabase
        .from('document_watermarks')
        .insert({
          ...settings,
          user_id: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Watermark created',
        description: `Watermark "${settings.name}" has been saved`,
      });

      fetchWatermarks();
      return data;
    } catch (error) {
      console.error('Error creating watermark:', error);
      toast({
        title: 'Error',
        description: 'Failed to create watermark',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchWatermarks, toast]);

  const updateWatermark = useCallback(async (
    id: string,
    updates: Partial<WatermarkSettings>
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // If setting as default, unset other defaults first
      if (updates.is_default) {
        await supabase
          .from('document_watermarks')
          .update({ is_default: false })
          .eq('user_id', user.user.id);
      }

      const { error } = await supabase
        .from('document_watermarks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Watermark updated',
        description: 'Watermark settings have been updated',
      });

      fetchWatermarks();
    } catch (error) {
      console.error('Error updating watermark:', error);
      toast({
        title: 'Error',
        description: 'Failed to update watermark',
        variant: 'destructive',
      });
    }
  }, [fetchWatermarks, toast]);

  const deleteWatermark = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_watermarks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Watermark deleted',
        description: 'Watermark has been removed',
      });

      fetchWatermarks();
    } catch (error) {
      console.error('Error deleting watermark:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete watermark',
        variant: 'destructive',
      });
    }
  }, [fetchWatermarks, toast]);

  const applyWatermarkToCanvas = useCallback((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    settings: WatermarkSettings,
    username?: string
  ) => {
    ctx.save();
    ctx.globalAlpha = settings.opacity;

    let text = settings.text_content || '';
    if (settings.include_date) {
      text += ` ${new Date().toLocaleDateString()}`;
    }
    if (settings.include_username && username) {
      text += ` ${username}`;
    }

    ctx.font = `${settings.font_size}px ${settings.font_family}`;
    ctx.fillStyle = settings.text_color;

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = settings.font_size;

    if (settings.position === 'tile') {
      const spacing = Math.max(textWidth, textHeight) * 1.5;
      for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
        for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((settings.rotation * Math.PI) / 180);
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }
      }
    } else {
      let x = canvas.width / 2;
      let y = canvas.height / 2;

      switch (settings.position) {
        case 'top-left':
          x = textWidth / 2 + 20;
          y = textHeight + 20;
          break;
        case 'top-right':
          x = canvas.width - textWidth / 2 - 20;
          y = textHeight + 20;
          break;
        case 'bottom-left':
          x = textWidth / 2 + 20;
          y = canvas.height - 20;
          break;
        case 'bottom-right':
          x = canvas.width - textWidth / 2 - 20;
          y = canvas.height - 20;
          break;
      }

      ctx.translate(x, y);
      ctx.rotate((settings.rotation * Math.PI) / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
    }

    ctx.restore();
  }, []);

  return {
    watermarks,
    defaultWatermark,
    isLoading,
    createWatermark,
    updateWatermark,
    deleteWatermark,
    applyWatermarkToCanvas,
    refetch: fetchWatermarks,
  };
}
