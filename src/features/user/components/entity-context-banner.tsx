import { ENTITY_TYPES } from '@/lib/constants';
import { Building2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EntityContextBannerProps {
  entityName: string;
  entityType: typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
  isOwner?: boolean;
  onEntityChange?: () => void;
}

/**
 * EntityContextBanner 컴포넌트
 * 
 * 현재 선택된 엔티티(조직/센터) 컨텍스트를 표시하는 배너
 * 
 * @see docs/ui-pages-design/251118_ui_pages_structure.md
 */
export function EntityContextBanner({
  entityName,
  entityType,
  isOwner = false,
  onEntityChange,
}: EntityContextBannerProps) {
  const Icon = entityType === ENTITY_TYPES.ORGANIZATION ? Building2 : MapPin;
  const entityTypeLabel = entityType === ENTITY_TYPES.ORGANIZATION ? '조직' : '센터';

  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{entityName}</h2>
            {isOwner && (
              <Badge variant="secondary" className="text-xs">
                소유자
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{entityTypeLabel} 컨텍스트</p>
        </div>
      </div>
      {onEntityChange && (
        <button
          onClick={onEntityChange}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          변경
        </button>
      )}
    </div>
  );
}

