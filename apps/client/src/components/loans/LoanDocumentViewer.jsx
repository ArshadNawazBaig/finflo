import { useState } from 'react';
import { File, Image, Download, ExternalLink, X, FileText } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const LoanDocumentViewer = ({ documents = [], isOpen, onClose, memberName }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!documents || documents.length === 0) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col rounded-[2.5rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              Attached Documents
            </DialogTitle>
            {memberName && (
              <p className="text-xs text-muted-foreground font-medium">
                Submitted by {memberName}
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {documents.filter(d => d.url !== 'N/A').map((doc, idx) => {
              const isImage = doc.type === 'image' || /\.(jpg|jpeg|png|webp)$/i.test(doc.url);
              const isPdf = doc.type === 'pdf' || /\.pdf$/i.test(doc.url);

              return (
                <div
                  key={doc._id || idx}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 bg-card/50 hover:bg-muted/20 transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted/30 flex items-center justify-center shrink-0 border border-border/30">
                    {isImage ? (
                      <img
                        src={doc.url}
                        alt={doc.name}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setSelectedImage(doc.url)}
                      />
                    ) : isPdf ? (
                      <File size={24} className="text-red-500" />
                    ) : (
                      <FileText size={24} className="text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md',
                        isImage ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600',
                      )}>
                        {isImage ? 'Image' : isPdf ? 'PDF' : doc.type || 'File'}
                      </span>
                      {doc.uploadedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isImage && (
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedImage(doc.url)}
                        className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Preview"
                      >
                        <Image size={14} />
                      </Button>
                    )}
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink size={14} />
                    </a>
                    <a
                      href={doc.url}
                      download
                      className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X size={20} />
          </Button>
          <img
            src={selectedImage}
            alt="Document preview"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default LoanDocumentViewer;
