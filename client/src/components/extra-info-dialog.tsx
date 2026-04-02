import { useState, useEffect } from "react";
import { X, Plus, Trash2, ExternalLink, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ExtraInfoItem {
  id: string;
  type: 'text' | 'link';
  title: string;
  content: string;
}

interface ExtraInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: ExtraInfoItem[];
  onSave: (items: ExtraInfoItem[]) => void;
}

export function ExtraInfoDialog({ isOpen, onClose, items, onSave }: ExtraInfoDialogProps) {
  const [localItems, setLocalItems] = useState<ExtraInfoItem[]>(items);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentItem, setCurrentItem] = useState<Partial<ExtraInfoItem>>({
    type: 'text',
    title: '',
    content: ''
  });

  // Sync localItems with items prop when dialog opens or items change
  useEffect(() => {
    setLocalItems(items || []);
  }, [items, isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (!currentItem.title?.trim() || !currentItem.content?.trim()) return;
    
    const newItem: ExtraInfoItem = {
      id: Date.now().toString(),
      type: currentItem.type as 'text' | 'link',
      title: currentItem.title,
      content: currentItem.content
    };

    if (editingIndex !== null) {
      const updated = [...localItems];
      updated[editingIndex] = newItem;
      setLocalItems(updated);
      setEditingIndex(null);
    } else {
      setLocalItems([...localItems, newItem]);
    }

    setCurrentItem({ type: 'text', title: '', content: '' });
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setCurrentItem(localItems[index]);
  };

  const handleDelete = (index: number) => {
    setLocalItems(localItems.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localItems);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={handleCancel} 
      />
      
      <div className="relative w-full max-w-2xl border border-white/10 bg-[#0f1012]/95 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-white/90 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Extra Information
            </h2>
            <button
              onClick={handleCancel}
              className="text-white/50 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[65vh]">
          <div className="p-6 space-y-8">
            {/* Add/Edit Form */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-5">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentItem({ ...currentItem, type: 'text' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentItem.type === 'text'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-white/50 hover:text-white/70 border border-transparent'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Text Info
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentItem({ ...currentItem, type: 'link' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    currentItem.type === 'link'
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'bg-white/5 text-white/50 hover:text-white/70 border border-transparent'
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Web Link
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs ml-1">Title</Label>
                  <Input
                    value={currentItem.title || ''}
                    onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                    placeholder="e.g., Dress Code, Parking, Spotify Playlist"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-purple-400/30 focus-visible:border-purple-400/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/60 text-xs ml-1">
                    {currentItem.type === 'link' ? 'URL' : 'Content Details'}
                  </Label>
                  <Input
                    value={currentItem.content || ''}
                    onChange={(e) => setCurrentItem({ ...currentItem, content: e.target.value })}
                    placeholder={
                      currentItem.type === 'link'
                        ? 'https://spotify.com/...'
                        : 'Describe special details for guests...'
                    }
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-purple-400/30 focus-visible:border-purple-400/50"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddItem}
                disabled={!currentItem.title?.trim() || !currentItem.content?.trim()}
                className="w-full h-10 bg-white/90 hover:bg-white text-black font-medium transition-all shadow-none"
              >
                {editingIndex !== null ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Information
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Extra Info
                  </>
                )}
              </Button>
            </div>

            {/* List of Items */}
            {localItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[13px] font-medium text-white/40 ml-1">Current Information Items</h3>
                <div className="space-y-2">
                  {localItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {item.type === 'link' ? (
                              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-purple-400" />
                            )}
                            <h4 className="text-sm font-medium text-white/90 truncate">{item.title}</h4>
                          </div>
                          <p className="text-xs text-white/50 break-words line-clamp-1">{item.content}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(index)}
                            className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 p-4 bg-[#0f1012]/95 backdrop-blur-sm">
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="flex-1 text-white/60 hover:text-white hover:bg-white/5 h-10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-10 rounded-md bg-white/90 hover:bg-white text-black font-medium shadow-none"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
