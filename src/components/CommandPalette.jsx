import React from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './ui/command';

export const CommandPalette = ({ open, onOpenChange, groups }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showClose={false} className="max-w-lg p-0 overflow-hidden" overlayClassName="z-[13000]">
                <Command>
                    <CommandInput placeholder="Digite um comando ou busque uma ação..." autoFocus />
                    <CommandList>
                        <CommandEmpty>Nenhum comando encontrado.</CommandEmpty>
                        {groups.map(group => (
                            <CommandGroup key={group.label} heading={group.label}>
                                {group.items.map(item => (
                                    <CommandItem
                                        key={item.id}
                                        value={item.keywords || item.label}
                                        onSelect={() => { onOpenChange(false); item.onSelect(); }}
                                    >
                                        {item.icon && (
                                            <span className="material-symbols-rounded shrink-0 text-[18px] text-muted-foreground">{item.icon}</span>
                                        )}
                                        <span className="flex-1">{item.label}</span>
                                        {item.shortcut && (
                                            <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{item.shortcut}</span>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            </DialogContent>
        </Dialog>
    );
};
