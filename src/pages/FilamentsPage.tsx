import { Tabs, TabsContent, TabsList } from '@/components/ui'
import { FilamentTypesSection } from '@/features/filaments/FilamentTypes'
import { SpoolsSection } from '@/features/filaments/Spools'

export default function FilamentsPage() {
  return (
    <Tabs defaultValue="spools" className="@container flex min-w-0 flex-col gap-4">
      <TabsList
        aria-label="Filament sekmeleri"
        className="w-full max-w-sm"
        tabs={[
          { value: 'spools', label: 'Makaralar (stok)' },
          { value: 'types', label: 'Türler' },
        ]}
      />
      <TabsContent value="spools" className="min-w-0 focus-visible:outline-none">
        <SpoolsSection />
      </TabsContent>
      <TabsContent value="types" className="mx-auto w-full max-w-4xl min-w-0 focus-visible:outline-none">
        <FilamentTypesSection />
      </TabsContent>
    </Tabs>
  )
}
