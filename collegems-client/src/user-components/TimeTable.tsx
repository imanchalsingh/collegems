import TimeTableHeader from "./TimeTableHeader"
import TimeTableStats from "./TimeTableStats"
import TimeTableFilter from "./TimeTableFilter"
import TimeTableGrid from "./TimeTableGrid"


export default function TimeTable(){
    return (
        <>
            <div className="space-y-6 p-6">
                {/* Time Table Header */}
                <TimeTableHeader />
                <TimeTableStats />
                <TimeTableFilter />
                <TimeTableGrid />
            </div>
        </>
    )
}