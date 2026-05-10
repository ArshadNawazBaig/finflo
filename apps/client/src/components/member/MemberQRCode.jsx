import { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn, capitalize } from '@/lib/utils';

const MemberQRCode = ({ member }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const qrPayload = JSON.stringify({
    type: 'finflo_pay',
    id: member?._id,
    name: member?.name,
    acc: member?.currentAccountNumber,
  });

  const handleDownload = useCallback(() => {
    const svgEl = qrRef.current?.querySelector('svg');
    if (!svgEl) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);

      const link = document.createElement('a');
      link.download = `finflo-qr-${member?.name?.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('QR code saved!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [member]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${capitalize(member?.name || '')} on FinFlo`,
          text: `Scan this QR to send money to ${capitalize(member?.name || '')} on FinFlo. Account: ${member?.currentAccountNumber}`,
        });
      } catch {
        // User cancelled
      }
    } else {
      toast.info('Share not supported — try downloading instead');
    }
  }, [member]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(member?.currentAccountNumber || member?._id);
    setCopied(true);
    toast.success('Account number copied!');
    setTimeout(() => setCopied(false), 2000);
  }, [member]);

  if (!member) return null;

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* QR Code */}
      <div
        ref={qrRef}
        className="p-6 bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/30"
      >
        <QRCodeSVG
          value={qrPayload}
          size={220}
          level="M"
          includeMargin={false}
          bgColor="#ffffff"
          fgColor="#0f172a"
        />
      </div>

      {/* Member info */}
      <div className="text-center space-y-1">
        <p className="text-lg font-black tracking-tight capitalize">
          {member.name}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground font-mono">
          {member.currentAccountNumber || member._id}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 w-full">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyId}
          className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
        >
          {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy ID'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
        >
          <Download size={14} />
          Save
        </Button>
        {navigator.share && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2"
          >
            <Share2 size={14} />
            Share
          </Button>
        )}
      </div>

      <p className="text-[10px] text-center text-muted-foreground font-medium leading-relaxed max-w-xs">
        Other members can scan this QR code to send you money instantly via the Transfer page.
      </p>
    </div>
  );
};

export default MemberQRCode;
