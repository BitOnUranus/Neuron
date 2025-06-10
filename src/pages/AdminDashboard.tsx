import React, { useState, useEffect } from 'react';
import { Content, YouTubeChannelConfig } from '../types';
import { getContent, saveContent, deleteContent, generateId, saveYouTubeConfig, getYouTubeConfig } from '../utils/storage';
import { Plus, Edit, Trash2, Eye, Copy, Settings, Youtube } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { resolveChannelId } from '../utils/googleAuth';

export const AdminDashboard: React.FC = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [showYouTubeConfig, setShowYouTubeConfig] = useState(false);
  const [youtubeConfig, setYoutubeConfig] = useState<YouTubeChannelConfig>({
    channelUrl: '',
    channelName: '',
    channelId: '',
    enabled: true
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    body: '',
    isPublic: false,
    youtubeChannelUrl: '',
    youtubeChannelId: '',
    attachments: []
  });

  useEffect(() => {
    loadContents();
    loadYouTubeConfig();
  }, []);

  const loadContents = async () => {
    try {
      const data = await getContent();
      setContents(data);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const loadYouTubeConfig = async () => {
    try {
      const config = await getYouTubeConfig();
      if (config) {
        setYoutubeConfig(config);
      }
    } catch (error) {
      console.error('Error loading YouTube config:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const contentData: Content = {
        id: editingContent?.id || generateId(),
        title: formData.title,
        description: formData.description,
        body: formData.body,
        isPublic: formData.isPublic,
        youtubeChannelUrl: formData.youtubeChannelUrl || youtubeConfig.channelUrl,
        youtubeChannelId: formData.youtubeChannelId || youtubeConfig.channelId,
        attachments: formData.attachments,
        createdAt: editingContent?.createdAt || new Date().toISOString()
      };

      await saveContent(contentData);
      await loadContents();
      resetForm();
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Failed to save content. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({ 
      title: '', 
      description: '', 
      body: '', 
      isPublic: false, 
      youtubeChannelUrl: '',
      youtubeChannelId: '',
      attachments: []
    });
    setIsCreating(false);
    setEditingContent(null);
  };

  const handleEdit = (content: Content) => {
    setEditingContent(content);
    setFormData({
      title: content.title,
      description: content.description,
      body: content.body,
      isPublic: content.isPublic,
      youtubeChannelUrl: content.youtubeChannelUrl || '',
      youtubeChannelId: content.youtubeChannelId || '',
      attachments: content.attachments || []
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        await deleteContent(id);
        await loadContents();
      } catch (error) {
        console.error('Error deleting content:', error);
        alert('Failed to delete content. Please try again.');
      }
    }
  };

  const copyLink = (id: string) => {
    const link = `${window.location.origin}/content/${id}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const openContent = (id: string) => {
    window.open(`/content/${id}`, '_blank');
  };

  const handleYouTubeConfigSave = async () => {
    try {
      // Resolve channel ID if not provided
      let channelId = youtubeConfig.channelId;
      if (!channelId && youtubeConfig.channelUrl) {
        channelId = await resolveChannelId(youtubeConfig.channelUrl) || '';
      }

      const configToSave = {
        ...youtubeConfig,
        channelId
      };

      await saveYouTubeConfig(configToSave);
      setYoutubeConfig(configToSave);
      setShowYouTubeConfig(false);
      alert('YouTube configuration saved!');
    } catch (error) {
      console.error('Error saving YouTube config:', error);
      alert('Failed to save YouTube configuration. Please try again.');
    }
  };

  const handleChannelUrlChange = async (url: string) => {
    setYoutubeConfig({ ...youtubeConfig, channelUrl: url });
    
    // Auto-resolve channel ID when URL changes
    if (url) {
      try {
        const channelId = await resolveChannelId(url);
        if (channelId) {
          setYoutubeConfig(prev => ({ ...prev, channelId }));
        }
      } catch (error) {
        console.error('Error resolving channel ID:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Management</h1>
          <p className="text-gray-600">Create and manage your premium content with YouTube subscription verification</p>
        </div>
        <button
          onClick={() => setShowYouTubeConfig(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <Youtube className="h-5 w-5" />
          <span>YouTube Config</span>
        </button>
      </div>

      {/* YouTube Configuration Modal */}
      {showYouTubeConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">YouTube Channel Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={youtubeConfig.channelName}
                  onChange={(e) => setYoutubeConfig({ ...youtubeConfig, channelName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Your Channel Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel URL
                </label>
                <input
                  type="url"
                  value={youtubeConfig.channelUrl}
                  onChange={(e) => handleChannelUrlChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="https://youtube.com/@yourchannel"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel ID
                </label>
                <input
                  type="text"
                  value={youtubeConfig.channelId}
                  onChange={(e) => setYoutubeConfig({ ...youtubeConfig, channelId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="UC... (auto-resolved from URL)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Channel ID is auto-resolved from the URL. You can also enter it manually.
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={youtubeConfig.enabled}
                  onChange={(e) => setYoutubeConfig({ ...youtubeConfig, enabled: e.target.checked })}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="enabled" className="ml-2 block text-sm text-gray-700">
                  Require YouTube subscription verification for content access
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleYouTubeConfigSave}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Save Configuration
              </button>
              <button
                onClick={() => setShowYouTubeConfig(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {isCreating && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-gray-200/50">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {editingContent ? 'Edit Content' : 'Create New Content'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter content title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Brief description of the content"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Body
              </label>
              <textarea
                required
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Write your premium content here..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Attachments
              </label>
              <FileUpload
                onFilesUploaded={(files) => setFormData({ ...formData, attachments: files })}
                existingFiles={formData.attachments}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom YouTube Channel URL (Optional)
                </label>
                <input
                  type="url"
                  value={formData.youtubeChannelUrl}
                  onChange={(e) => setFormData({ ...formData, youtubeChannelUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Override default YouTube channel URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom YouTube Channel ID (Optional)
                </label>
                <input
                  type="text"
                  value={formData.youtubeChannelId}
                  onChange={(e) => setFormData({ ...formData, youtubeChannelId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="UC... channel ID"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                Make this content publicly accessible (no subscription required)
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {editingContent ? 'Update Content' : 'Create Content'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Button */}
      {!isCreating && (
        <button
          onClick={() => setIsCreating(true)}
          className="mb-8 inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Content
        </button>
      )}

      {/* Content List */}
      <div className="grid gap-6">
        {contents.length === 0 ? (
          <div className="text-center py-12 bg-white/50 rounded-xl">
            <p className="text-gray-500">No content created yet. Click "Create New Content\" to get started.</p>
          </div>
        ) : (
          contents.map((content) => (
            <div key={content.id} className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{content.title}</h3>
                  <p className="text-gray-600 mb-2">{content.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Created: {new Date(content.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${content.isPublic ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {content.isPublic ? 'Public' : 'Subscription Required'}
                    </span>
                    {content.attachments && content.attachments.length > 0 && (
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {content.attachments.length} file(s)
                      </span>
                    )}
                    {content.youtubeChannelId && (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        YouTube Verified
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => openContent(content.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Content"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => copyLink(content.id)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Copy Link"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(content)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Edit Content"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(content.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Content"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Shareable Link:</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm bg-white px-3 py-2 rounded border">
                    {window.location.origin}/content/{content.id}
                  </code>
                  <button
                    onClick={() => copyLink(content.id)}
                    className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};