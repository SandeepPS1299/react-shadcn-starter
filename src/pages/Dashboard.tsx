import { PageHeader, PageHeaderHeading } from "@/components/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DraggableList from "./DraggableList";

export default function Dashboard() {
    return (
        <>
            <PageHeader>
                <PageHeaderHeading>Dashboard</PageHeaderHeading>
            </PageHeader>
           <DraggableList/>
        </>
    )
}
