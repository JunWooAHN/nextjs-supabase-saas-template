'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ENTITY_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, MapPin, ChevronDown } from 'lucide-react';
import type { UserMembership } from '@/lib/user/memberships';

interface EntitySwitcherProps {
  organizations: UserMembership[];
  centers: UserMembership[];
  currentEntityId?: string;
  currentEntityType?: typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];
  onEntityChange?: (entityId: string, entityType: typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]) => void;
}

/**
 * EntitySwitcher 컴포넌트
 * 
 * 사용자가 속한 조직/센터 목록을 표시하고 선택할 수 있는 드롭다운 컴포넌트
 * 엔티티 선택 시 해당 컨텍스트로 라우팅
 * 
 * @see docs/ui-pages-design/251118_ui_pages_structure.md
 */
export function EntitySwitcher({
  organizations,
  centers,
  currentEntityId,
  currentEntityType,
  onEntityChange,
}: EntitySwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 현재 선택된 엔티티 정보
  const currentEntity = [...organizations, ...centers].find(
    (e) => e.entity_id === currentEntityId && e.entity_type === currentEntityType
  );

  const handleEntitySelect = (
    entityId: string,
    entityType: typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]
  ) => {
    setOpen(false);
    
    // 라우팅
    if (entityType === ENTITY_TYPES.ORGANIZATION) {
      router.push(`/(user)/org/${entityId}`);
    } else {
      router.push(`/(user)/center/${entityId}`);
    }

    // 콜백 호출
    onEntityChange?.(entityId, entityType);
  };

  const allEntities = [...organizations, ...centers];

  if (allEntities.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">소속된 조직이나 센터가 없습니다.</p>
        <p className="text-xs mt-1">조직 관리자에게 초대를 요청하거나 새 조직을 생성하세요.</p>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            {currentEntity ? (
              <>
                {currentEntity.entity_type === ENTITY_TYPES.ORGANIZATION ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                <span className="font-medium">{currentEntity.entity_name}</span>
                {currentEntity.is_owner && (
                  <span className="text-xs text-muted-foreground">(소유자)</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">엔티티 선택</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px]">
        {organizations.length > 0 && (
          <>
            <DropdownMenuLabel>조직</DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.entity_id}
                onClick={() => handleEntitySelect(org.entity_id, ENTITY_TYPES.ORGANIZATION)}
                className="flex items-center gap-2"
              >
                <Building2 className="h-4 w-4" />
                <span className="flex-1">{org.entity_name}</span>
                {org.is_owner && (
                  <span className="text-xs text-muted-foreground">소유자</span>
                )}
                {currentEntityId === org.entity_id &&
                  currentEntityType === ENTITY_TYPES.ORGANIZATION && (
                    <span className="text-xs text-primary">✓</span>
                  )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {centers.length > 0 && (
          <>
            {organizations.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>센터</DropdownMenuLabel>
            {centers.map((center) => (
              <DropdownMenuItem
                key={center.entity_id}
                onClick={() => handleEntitySelect(center.entity_id, ENTITY_TYPES.CENTER)}
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                <span className="flex-1">{center.entity_name}</span>
                {center.is_owner && (
                  <span className="text-xs text-muted-foreground">소유자</span>
                )}
                {currentEntityId === center.entity_id &&
                  currentEntityType === ENTITY_TYPES.CENTER && (
                    <span className="text-xs text-primary">✓</span>
                  )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

