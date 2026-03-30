import java.io.*;
import java.text.SimpleDateFormat;
import java.util.*;
import net.sf.mpxj.*;
import net.sf.mpxj.reader.*;

/**
 * Reads an MS Project file (.mpp/.mpx/.xml) and outputs task data as JSON to stdout.
 * Usage: java -cp "mpxj.jar;." MppToJson input.mpp
 */
public class MppToJson {
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: java MppToJson <file.mpp>");
            System.exit(1);
        }

        ProjectFile project = new UniversalProjectReader().read(args[0]);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");

        StringBuilder sb = new StringBuilder();
        sb.append("[");
        boolean first = true;

        for (Task task : project.getTasks()) {
            String name = task.getName();
            if (name == null || name.trim().isEmpty()) continue;

            if (!first) sb.append(",");
            first = false;

            sb.append("{");
            sb.append("\"name\":").append(jsonStr(name.trim()));

            // WBS
            String wbs = task.getWBS();
            sb.append(",\"wbs\":").append(jsonStr(wbs));

            // Dates
            Date start = task.getStart();
            Date finish = task.getFinish();
            sb.append(",\"start_date\":").append(start != null ? jsonStr(sdf.format(start)) : "null");
            sb.append(",\"end_date\":").append(finish != null ? jsonStr(sdf.format(finish)) : "null");

            // Duration
            Duration dur = task.getDuration();
            if (dur != null) {
                double days = dur.convertUnits(TimeUnit.DAYS, project.getProjectProperties()).getDuration();
                sb.append(",\"duration_days\":").append((int) Math.round(days));
            } else {
                sb.append(",\"duration_days\":null");
            }

            // Progress
            Number pct = task.getPercentageComplete();
            sb.append(",\"progress\":").append(pct != null ? pct.doubleValue() : 0);

            // Milestone
            sb.append(",\"is_milestone\":").append(task.getMilestone() != null && task.getMilestone());

            // Outline level
            Integer ol = task.getOutlineLevel();
            sb.append(",\"outline_level\":").append(ol != null ? Math.max(1, ol) : 1);

            // Resource assignments
            List<ResourceAssignment> assignments = task.getResourceAssignments();
            if (assignments != null && !assignments.isEmpty()) {
                StringBuilder resources = new StringBuilder();
                for (ResourceAssignment ra : assignments) {
                    Resource res = ra.getResource();
                    if (res != null && res.getName() != null && !res.getName().trim().isEmpty()) {
                        if (resources.length() > 0) resources.append(", ");
                        resources.append(res.getName().trim());
                    }
                }
                sb.append(",\"responsible_name\":").append(resources.length() > 0 ? jsonStr(resources.toString()) : "null");
            } else {
                sb.append(",\"responsible_name\":null");
            }

            sb.append("}");
        }

        sb.append("]");
        System.out.println(sb.toString());
    }

    private static String jsonStr(String s) {
        if (s == null || s.trim().isEmpty()) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
                        .replace("\n", "\\n").replace("\r", "\\r")
                        .replace("\t", "\\t") + "\"";
    }
}
