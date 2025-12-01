import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dockerApi } from '../lib/api';
import { useTheme } from '../context/ThemeContext';
import { useActivityLog } from '../context/ActivityLogContext';
import { 
  Package, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Layers, 
  Info, 
  HardDrive, 
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Copy,
  Play
} from 'lucide-react';

const Images = () => {
  const { isDark } = useTheme();
  const { addLog } = useActivityLog();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showPullModal, setShowPullModal] = useState(false);
  const [pullImageData, setPullImageData] = useState({ name: '', tag: 'latest' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedImage, setExpandedImage] = useState(null);

  // Fetch images
  const { data: images = [], isLoading, error, refetch } = useQuery({
    queryKey: ['images'],
    queryFn: () => dockerApi.getImages().then(res => res.data),
    refetchInterval: 5000,
  });

  // Pull image mutation
  const pullMutation = useMutation({
    mutationFn: (data) => dockerApi.pullImage(data),
    onMutate: () => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'info',
        message: `Pulling image ${pullImageData.name}:${pullImageData.tag}`,
        container: null,
        timestamp: new Date()
      });
    },
    onSuccess: () => {
      setShowPullModal(false);
      setPullImageData({ name: '', tag: 'latest' });
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Image ${pullImageData.name}:${pullImageData.tag} pull started`,
        container: null,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
    onError: (error) => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to pull image: ${error.message}`,
        container: null,
        timestamp: new Date()
      });
    },
  });

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => dockerApi.deleteImage(id),
    onMutate: (id) => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'warning',
        message: `Deleting image ${id}`,
        container: null,
        timestamp: new Date()
      });
    },
    onSuccess: (_, id) => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Image ${id} deleted successfully`,
        container: null,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
    onError: (error, id) => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to delete image ${id}: ${error.message}`,
        container: null,
        timestamp: new Date()
      });
    },
  });

  // Prune images mutation
  const pruneMutation = useMutation({
    mutationFn: () => dockerApi.pruneImages(),
    onMutate: () => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'info',
        message: 'Pruning unused images',
        container: null,
        timestamp: new Date()
      });
    },
    onSuccess: (data) => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'success',
        message: `Pruned ${data.data.imagesDeleted?.length || 0} images, reclaimed ${data.data.spaceReclaimed || 0} bytes`,
        container: null,
        timestamp: new Date()
      });
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
    onError: (error) => {
      addLog({
        id: `log-${Date.now()}`,
        type: 'error',
        message: `Failed to prune images: ${error.message}`,
        container: null,
        timestamp: new Date()
      });
    },
  });

  // Filter images
  const filteredImages = images.filter(image => {
    const matchesSearch = searchTerm === '' || 
      image.repoTags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      image.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTag = filterTag === '' || 
      image.repoTags.some(tag => tag.includes(filterTag));
    
    return matchesSearch && matchesTag;
  });

  // Format bytes to human readable
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Handle pull image
  const handlePullImage = () => {
    if (!pullImageData.name.trim()) {
      addLog({
        id: `log-${Date.now()}`,
        type: 'warning',
        message: 'Image name is required',
        container: null,
        timestamp: new Date()
      });
      return;
    }
    pullMutation.mutate(pullImageData);
  };

  // Handle delete image
  const handleDeleteImage = (image) => {
    if (window.confirm(`Are you sure you want to delete image "${image.repoTags[0] || image.id}"? This action cannot be undone.`)) {
      deleteMutation.mutate(image.id);
    }
  };

  // Toggle image details
  const toggleImageDetails = (imageId) => {
    setExpandedImage(expandedImage === imageId ? null : imageId);
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    addLog({
      id: `log-${Date.now()}`,
      type: 'info',
      message: 'Copied to clipboard',
      container: null,
      timestamp: new Date()
    });
  };

  // Get image status
  const getImageStatus = (image) => {
    if (image.repoTags[0] === '<none>:<none>') {
      return { text: 'Dangling', color: isDark ? 'text-amber-400' : 'text-amber-600', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-100' };
    }
    return { text: 'Active', color: isDark ? 'text-seafoam-400' : 'text-seafoam-600', bg: isDark ? 'bg-seafoam-900/20' : 'bg-seafoam-100' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className={`w-8 h-8 animate-spin ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-8 rounded-2xl border ${isDark ? 'bg-gradient-to-br from-coral-900/20 to-coral-950/20 border-coral-700/30' : 'bg-gradient-to-br from-coral-50 to-coral-100 border-coral-200'}`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${isDark ? 'bg-coral-900/40' : 'bg-coral-100'}`}>
            <AlertCircle className={`w-8 h-8 ${isDark ? 'text-coral-400' : 'text-coral-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-coral-300' : 'text-coral-700'}`}>
              Failed to Load Images
            </h3>
            <p className={`mb-4 ${isDark ? 'text-coral-400' : 'text-coral-600'}`}>
              {error.message || 'Unable to fetch images from Docker daemon'}
            </p>
            <button 
              onClick={() => refetch()}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                isDark 
                  ? 'bg-gradient-to-r from-coral-600 to-coral-700 text-white hover:from-coral-700 hover:to-coral-800'
                  : 'bg-gradient-to-r from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700'
              }`}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
            Image Registry
          </h1>
          <p className={isDark ? 'text-ocean-300' : 'text-ocean-600'}>
            Manage Docker images, pull from registries, and clean up storage
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => pruneMutation.mutate()}
            disabled={pruneMutation.isPending}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700'
            } ${pruneMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {pruneMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            Prune Unused
          </button>
          <button
            onClick={() => setShowPullModal(true)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-gradient-to-r from-seafoam-600 to-seafoam-700 text-white hover:from-seafoam-700 hover:to-seafoam-800'
                : 'bg-gradient-to-r from-seafoam-500 to-seafoam-600 text-white hover:from-seafoam-600 hover:to-seafoam-700'
            }`}
          >
            <Download className="w-5 h-5" />
            Pull Image
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
          isDark
            ? 'bg-gradient-to-br from-ocean-900/40 to-ocean-950/40 border-ocean-700/30'
            : 'bg-gradient-to-br from-white to-ocean-50/50 border border-ocean-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-ocean-800/60' : 'bg-ocean-100'}`}>
              <Package className={`w-6 h-6 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
            </div>
            <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-ocean-800 text-ocean-300' : 'bg-ocean-100 text-ocean-600'}`}>
              Total
            </div>
          </div>
          <div className="space-y-2">
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
              {images.length}
            </div>
            <div className={`text-sm ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
              {images.length} Docker images
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
          isDark
            ? 'bg-gradient-to-br from-ocean-900/40 to-ocean-950/40 border-ocean-700/30'
            : 'bg-gradient-to-br from-white to-ocean-50/50 border border-ocean-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-ocean-800/60' : 'bg-ocean-100'}`}>
              <HardDrive className={`w-6 h-6 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
            </div>
            <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-ocean-800 text-ocean-300' : 'bg-ocean-100 text-ocean-600'}`}>
              Storage
            </div>
          </div>
          <div className="space-y-2">
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
              {formatBytes(images.reduce((total, img) => total + img.size, 0))}
            </div>
            <div className={`text-sm ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
              Total disk usage
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
          isDark
            ? 'bg-gradient-to-br from-ocean-900/40 to-ocean-950/40 border-ocean-700/30'
            : 'bg-gradient-to-br from-white to-ocean-50/50 border border-ocean-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-ocean-800/60' : 'bg-ocean-100'}`}>
              <Tag className={`w-6 h-6 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
            </div>
            <div className={`text-sm font-semibold px-3 py-1 rounded-full ${isDark ? 'bg-ocean-800 text-ocean-300' : 'bg-ocean-100 text-ocean-600'}`}>
              Dangling
            </div>
          </div>
          <div className="space-y-2">
            <div className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
              {images.filter(img => img.repoTags[0] === '<none>:<none>').length}
            </div>
            <div className={`text-sm ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
              Untagged images
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className={`p-6 rounded-2xl border ${isDark ? 'border-ocean-800 bg-gradient-to-br from-ocean-900/20 to-ocean-950/20' : 'border-ocean-100 bg-gradient-to-br from-white to-ocean-50/30'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`} />
              <input
                type="text"
                placeholder="Search images by name, tag, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors ${
                  isDark 
                    ? 'bg-ocean-800/50 border-ocean-700 text-white placeholder-ocean-400 focus:border-ocean-500' 
                    : 'bg-white border-ocean-200 text-ocean-900 placeholder-ocean-400 focus:border-ocean-500'
                }`}
              />
            </div>
          </div>
          <div className="md:w-64">
            <div className="relative">
              <Filter className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`} />
              <input
                type="text"
                placeholder="Filter by tag..."
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border transition-colors ${
                  isDark 
                    ? 'bg-ocean-800/50 border-ocean-700 text-white placeholder-ocean-400 focus:border-ocean-500' 
                    : 'bg-white border-ocean-200 text-ocean-900 placeholder-ocean-400 focus:border-ocean-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Images List */}
      <div className={`rounded-2xl border ${isDark ? 'border-ocean-800 bg-gradient-to-br from-ocean-900/20 to-ocean-950/20' : 'border-ocean-100 bg-gradient-to-br from-white to-ocean-50/30'}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                Docker Images
              </h2>
              <p className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>
                {filteredImages.length} of {images.length} images
              </p>
            </div>
          </div>

          {filteredImages.length > 0 ? (
            <div className="space-y-4">
              {filteredImages.map((image) => {
                const status = getImageStatus(image);
                const isExpanded = expandedImage === image.id;
                
                return (
                  <div 
                    key={image.id} 
                    className={`rounded-xl border transition-all duration-300 overflow-hidden ${
                      isDark 
                        ? 'bg-gradient-to-br from-ocean-900/30 to-ocean-950/30 border-ocean-700/30 hover:border-ocean-500/50' 
                        : 'bg-white border-ocean-200 hover:border-ocean-300'
                    }`}
                  >
                    {/* Image Header */}
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.bg} ${status.color}`}>
                              {status.text}
                            </div>
                            <div className="flex-1">
                              <h3 className={`text-lg font-bold truncate ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                                {image.repoTags[0] === '<none>:<none>' ? image.id : image.repoTags[0]}
                              </h3>
                              {image.repoTags.length > 1 && (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {image.repoTags.slice(1, 4).map((tag, idx) => (
                                    <span 
                                      key={idx}
                                      className={`text-xs px-2 py-1 rounded-full ${
                                        isDark 
                                          ? 'bg-ocean-800 text-ocean-300' 
                                          : 'bg-ocean-100 text-ocean-600'
                                      }`}
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                  {image.repoTags.length > 4 && (
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      isDark 
                                        ? 'bg-ocean-800 text-ocean-300' 
                                        : 'bg-ocean-100 text-ocean-600'
                                    }`}>
                                      +{image.repoTags.length - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-ocean-800/40' : 'bg-ocean-100'}`}>
                              <HardDrive className={`w-4 h-4 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
                              <span className={`text-sm ${isDark ? 'text-ocean-200' : 'text-ocean-700'}`}>
                                {formatBytes(image.size)}
                              </span>
                            </div>
                            
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-ocean-800/40' : 'bg-ocean-100'}`}>
                              <Calendar className={`w-4 h-4 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
                              <span className={`text-sm ${isDark ? 'text-ocean-200' : 'text-ocean-700'}`}>
                                {formatDate(image.created)}
                              </span>
                            </div>
                            
                            <div className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-ocean-800/40' : 'bg-ocean-100'}`}>
                              <Tag className={`w-4 h-4 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`} />
                              <span className={`text-sm ${isDark ? 'text-ocean-200' : 'text-ocean-700'}`}>
                                {image.repoTags.length} tags
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => toggleImageDetails(image.id)}
                            className={`p-2.5 rounded-lg transition-all duration-300 ${
                              isDark
                                ? 'bg-ocean-800 text-ocean-300 hover:bg-ocean-700'
                                : 'bg-ocean-100 text-ocean-600 hover:bg-ocean-200'
                            }`}
                            title="View Details"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(image.id)}
                            className={`p-2.5 rounded-lg transition-all duration-300 ${
                              isDark
                                ? 'bg-ocean-800 text-ocean-300 hover:bg-ocean-700'
                                : 'bg-ocean-100 text-ocean-600 hover:bg-ocean-200'
                            }`}
                            title="Copy ID"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteImage(image)}
                            disabled={deleteMutation.isPending}
                            className={`p-2.5 rounded-lg transition-all duration-300 ${
                              deleteMutation.isPending
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : isDark
                                ? 'bg-gradient-to-br from-red-500/20 to-red-600/20 text-red-400 hover:from-red-600/30 hover:to-red-700/30'
                                : 'bg-gradient-to-br from-red-100 to-red-200 text-red-600 hover:from-red-200 hover:to-red-300'
                            }`}
                            title="Delete Image"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Trash2 className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className={`border-t ${isDark ? 'border-ocean-800' : 'border-ocean-200'}`}>
                        <div className="p-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className={`font-bold mb-3 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                Image Details
                              </h4>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>ID:</span>
                                  <code className={`text-sm font-mono ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                    {image.id}
                                  </code>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>Parent ID:</span>
                                  <code className={`text-sm font-mono ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                    {image.parentId ? image.parentId.slice(7, 19) : 'None'}
                                  </code>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>Virtual Size:</span>
                                  <span className={`font-medium ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                    {formatBytes(image.virtualSize)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className={isDark ? 'text-ocean-400' : 'text-ocean-600'}>Created:</span>
                                  <span className={`font-medium ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                    {new Date(image.created * 1000).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className={`font-bold mb-3 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                Tags & Digests
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <div className={`text-sm mb-2 ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`}>Tags:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {image.repoTags.map((tag, idx) => (
                                      <span 
                                        key={idx}
                                        className={`px-3 py-1 rounded-full text-sm ${
                                          isDark 
                                            ? 'bg-ocean-800 text-ocean-300' 
                                            : 'bg-ocean-100 text-ocean-600'
                                        }`}
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {image.repoDigests && image.repoDigests[0] !== '<none>@<none>' && (
                                  <div>
                                    <div className={`text-sm mb-2 ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`}>Digests:</div>
                                    <div className="space-y-1">
                                      {image.repoDigests.slice(0, 2).map((digest, idx) => (
                                        <code 
                                          key={idx}
                                          className={`block text-xs font-mono truncate px-2 py-1 rounded ${
                                            isDark 
                                              ? 'bg-ocean-800/50 text-ocean-300' 
                                              : 'bg-ocean-100 text-ocean-700'
                                          }`}
                                        >
                                          {digest}
                                        </code>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {image.labels && Object.keys(image.labels).length > 0 && (
                            <div className="mt-6">
                              <h4 className={`font-bold mb-3 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                                Labels
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(image.labels).map(([key, value]) => (
                                  <div 
                                    key={key}
                                    className={`p-3 rounded-lg ${isDark ? 'bg-ocean-800/40' : 'bg-ocean-100'}`}
                                  >
                                    <div className={`text-sm font-medium mb-1 ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`}>
                                      {key}
                                    </div>
                                    <div className={`text-sm ${isDark ? 'text-ocean-200' : 'text-ocean-700'}`}>
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-32 h-32 mx-auto mb-6 opacity-50">
                <Package className="w-full h-full text-ocean-400" />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                No Images Found
              </h3>
              <p className={`mb-8 max-w-md mx-auto ${isDark ? 'text-ocean-400' : 'text-ocean-600'}`}>
                {searchTerm || filterTag 
                  ? 'No images match your search criteria. Try a different search term.'
                  : 'Your image registry is empty. Pull your first image to get started.'}
              </p>
              <button 
                onClick={() => setShowPullModal(true)}
                className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                  isDark
                    ? 'bg-gradient-to-r from-ocean-600 to-ocean-700 text-white hover:from-ocean-700 hover:to-ocean-800 shadow-lg'
                    : 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white hover:from-ocean-600 hover:to-ocean-700 shadow-lg'
                }`}
              >
                Pull Your First Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pull Image Modal */}
      {showPullModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-2xl p-6 ${
            isDark 
              ? 'bg-gradient-to-br from-ocean-900 to-ocean-950 border border-ocean-700' 
              : 'bg-white border border-ocean-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-ocean-900'}`}>
                Pull Docker Image
              </h3>
              <button
                onClick={() => setShowPullModal(false)}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-ocean-800' : 'hover:bg-ocean-100'
                }`}
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                  Image Name
                </label>
                <input
                  type="text"
                  value={pullImageData.name}
                  onChange={(e) => setPullImageData({ ...pullImageData, name: e.target.value })}
                  placeholder="e.g., nginx, ubuntu, postgres"
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    isDark 
                      ? 'bg-ocean-800 border-ocean-700 text-white placeholder-ocean-400 focus:border-ocean-500' 
                      : 'bg-white border-ocean-200 text-ocean-900 placeholder-ocean-400 focus:border-ocean-500'
                  }`}
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
                  You can specify a registry: e.g., docker.io/library/nginx
                </p>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-ocean-300' : 'text-ocean-700'}`}>
                  Tag (optional)
                </label>
                <input
                  type="text"
                  value={pullImageData.tag}
                  onChange={(e) => setPullImageData({ ...pullImageData, tag: e.target.value })}
                  placeholder="latest"
                  className={`w-full px-4 py-3 rounded-xl border transition-colors ${
                    isDark 
                      ? 'bg-ocean-800 border-ocean-700 text-white placeholder-ocean-400 focus:border-ocean-500' 
                      : 'bg-white border-ocean-200 text-ocean-900 placeholder-ocean-400 focus:border-ocean-500'
                  }`}
                />
                <p className={`text-xs mt-2 ${isDark ? 'text-ocean-400' : 'text-ocean-500'}`}>
                  Defaults to 'latest' if not specified
                </p>
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={() => setShowPullModal(false)}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-colors ${
                    isDark 
                      ? 'bg-ocean-800 text-ocean-300 hover:bg-ocean-700' 
                      : 'bg-ocean-100 text-ocean-600 hover:bg-ocean-200'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePullImage}
                  disabled={pullMutation.isPending || !pullImageData.name.trim()}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                    pullMutation.isPending || !pullImageData.name.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : isDark
                      ? 'bg-gradient-to-r from-seafoam-600 to-seafoam-700 text-white hover:from-seafoam-700 hover:to-seafoam-800'
                      : 'bg-gradient-to-r from-seafoam-500 to-seafoam-600 text-white hover:from-seafoam-600 hover:to-seafoam-700'
                  }`}
                >
                  {pullMutation.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Pulling...
                    </span>
                  ) : (
                    'Pull Image'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Images;