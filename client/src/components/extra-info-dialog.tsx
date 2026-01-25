import { useState } from "react";
import { X, Plus, Trash2, ExternalLink, FileText } from "lucide-react";
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
    setLocalItems(items);
    setCurrentItem({ type: 'text', title: '', content: '' });
    setEditingIndex(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/20 bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Extra Info</h2>
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-white/70" />
          </button>
        </div>

        <ScrollArea className="h-[calc(90vh-180px)] p-6">
          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentItem({ ...currentItem, type: 'text' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    currentItem.type === 'text'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentItem({ ...currentItem, type: 'link' })}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    currentItem.type === 'link'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  <ExternalLink className="h-4 w-4" />
                  Link
                </button>
              </div>

              <div>
                <Label className="text-white/80 text-sm mb-2">Title</Label>
                <Input
                  value={currentItem.title || ''}
                  onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                  placeholder="e.g., Playlist, Parking Info, Dress Code"
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <div>
                <Label className="text-white/80 text-sm mb-2">
                  {currentItem.type === 'link' ? 'URL' : 'Information'}
                </Label>
                <Input
                  value={currentItem.content || ''}
                  onChange={(e) => setCurrentItem({ ...currentItem, content: e.target.value })}
                  placeholder={
                    currentItem.type === 'link'
                      ? 'https://example.com'
                      : 'Add your information here...'
                  }
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                />
              </div>

              <Button
                onClick={handleAddItem}
                disabled={!currentItem.title?.trim() || !currentItem.content?.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingIndex !== null ? 'Update Item' : 'Add Item'}
              </Button>
            </div>

            {/* List of Items */}
            {localItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/60">Added Items</h3>
                {localItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'link' ? (
                            <ExternalLink className="h-4 w-4 text-cyan-400 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-purple-400 shrink-0" />
                          )}
                          <h4 className="text-sm font-medium text-white truncate">{item.title}</h4>
                        </div>
                        <p className="text-xs text-white/60 break-words">{item.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEdit(index)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <FileText className="h-4 w-4 text-white/70" />
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="border-white/20 text-white/70 hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
