import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ChevronRight,
    ChevronDown,
    PanelLeftClose,
    PanelLeft,
    Sparkles
} from 'lucide-react';
import { FEATURE_TABS, SIDEBAR_CATEGORIES, type FeatureTab, type SidebarCategory } from '../constants/featureTabs';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface SimplifyDriveSidebarProps {
    activeFeature: string;
    onFeatureChange: (featureId: string) => void;
    isCollapsed?: boolean;
    onCollapsedChange?: (collapsed: boolean) => void;
}

export function SimplifyDriveSidebar({
    activeFeature,
    onFeatureChange,
    isCollapsed: controlledCollapsed,
    onCollapsedChange
}: SimplifyDriveSidebarProps) {
    // Internal collapsed state if not controlled
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const isCollapsed = controlledCollapsed ?? internalCollapsed;
    const setIsCollapsed = onCollapsedChange ?? setInternalCollapsed;

    // Track expanded categories
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        SIDEBAR_CATEGORIES.forEach(cat => {
            initial[cat.id] = cat.defaultExpanded ?? false;
        });
        return initial;
    });

    const toggleCategory = (categoryId: string) => {
        if (isCollapsed) {
            // When collapsed, clicking expands sidebar and the category
            setIsCollapsed(false);
            setExpandedCategories(prev => ({ ...prev, [categoryId]: true }));
        } else {
            setExpandedCategories(prev => ({
                ...prev,
                [categoryId]: !prev[categoryId]
            }));
        }
    };

    const getFeaturesByCategory = (categoryId: string): FeatureTab[] => {
        return FEATURE_TABS.filter(tab => tab.category === categoryId);
    };

    const handleFeatureClick = (featureId: string) => {
        onFeatureChange(featureId);
        // Auto-collapse sidebar when a feature is selected
        setIsCollapsed(true);
    };

    return (
        <TooltipProvider delayDuration={0}>
            <div
                className={cn(
                    "h-full bg-card border-r border-border flex flex-col transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-16" : "w-72"
                )}
            >
                {/* Collapse Toggle */}
                <div className="p-2 border-b border-border flex justify-end">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="h-8 w-8 p-0"
                    >
                        {isCollapsed ? (
                            <PanelLeft className="h-4 w-4" />
                        ) : (
                            <PanelLeftClose className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2 space-y-0.5">
                        {SIDEBAR_CATEGORIES.map((category) => {
                            const CategoryIcon = category.icon;
                            const features = getFeaturesByCategory(category.id);
                            const isExpanded = expandedCategories[category.id];
                            const hasActiveFeature = features.some(f => f.id === activeFeature);

                            return (
                                <div key={category.id} className="space-y-0.5">
                                    {/* Category Header */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={() => toggleCategory(category.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                                    "hover:bg-muted",
                                                    hasActiveFeature && !isExpanded && "bg-primary/10 text-primary"
                                                )}
                                            >
                                                <CategoryIcon className="h-4 w-4 flex-shrink-0" />
                                                {!isCollapsed && (
                                                    <>
                                                        <span className="flex-1 text-left truncate">{category.label}</span>
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </>
                                                )}
                                            </button>
                                        </TooltipTrigger>
                                        {isCollapsed && (
                                            <TooltipContent side="right" sideOffset={10}>
                                                <p className="font-medium">{category.label}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {features.length} items
                                                </p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>

                                    {/* Feature Items */}
                                    {!isCollapsed && isExpanded && (
                                        <div className="ml-4 pl-2 border-l border-border/50 space-y-0.5">
                                            {features.map((feature) => {
                                                const FeatureIcon = feature.icon;
                                                const isActive = activeFeature === feature.id;

                                                return (
                                                    <button
                                                        key={feature.id}
                                                        onClick={() => handleFeatureClick(feature.id)}
                                                        className={cn(
                                                            "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                                                            isActive
                                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                                : "text-foreground hover:bg-muted"
                                                        )}
                                                    >
                                                        <FeatureIcon className="h-4 w-4 flex-shrink-0" />
                                                        <span className="flex-1 text-left truncate">{feature.label}</span>
                                                        {feature.badge && (
                                                            <Badge
                                                                variant="secondary"
                                                                className={cn(
                                                                    "text-[10px] px-1.5 py-0",
                                                                    feature.badge === 'AI' && "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
                                                                    feature.badge === 'New' && "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                                                                )}
                                                            >
                                                                {feature.badge}
                                                            </Badge>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>


            </div>
        </TooltipProvider>
    );
}
