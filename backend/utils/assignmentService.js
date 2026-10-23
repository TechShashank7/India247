import Department from '../models/Department.js';
import Officer from '../models/Officer.js';

export const assignComplaint = async (category, region, aiDepartment) => {
  try {
    // 1. Verify Department using Department collection based on Category or AI Department name
    // We try to match by handledCategories first.
    let department = await Department.findOne({ handledCategories: category, active: true });
    
    // If not found, try to match by AI department name
    if (!department && aiDepartment) {
      department = await Department.findOne({ 
        $or: [
          { name: new RegExp(aiDepartment, 'i') },
          { code: new RegExp(aiDepartment, 'i') }
        ],
        active: true 
      });
    }

    // Keyword heuristics if department name had variations
    if (!department) {
      const combined = `${category || ''} ${aiDepartment || ''}`.toLowerCase();
      if (/electric|light|power|pole/i.test(combined)) {
        department = await Department.findOne({ code: 'MCD', active: true });
      } else if (/road|construct|bridge|infra|pavement|footpath/i.test(combined)) {
        department = await Department.findOne({ code: 'PWD', active: true });
      } else if (/water|jal|sewer|drain|pipe/i.test(combined)) {
        department = await Department.findOne({ code: 'DJB', active: true });
      } else if (/sanitat|clean|garbage|waste|animal|encroach|park|civic|public/i.test(combined)) {
        department = await Department.findOne({ code: 'MCD', active: true });
      } else {
        // Fallback to MCD as general municipal body
        department = await Department.findOne({ code: 'MCD', active: true }) || await Department.findOne({ active: true });
      }
    }

    if (!department) {
      return { departmentId: null, officerId: null };
    }

    const departmentId = department._id;

    // 2. Find Officer by Department and Region, sorted by lowest currentLoad
    let officer = null;
    if (region) {
      officer = await Officer.findOne({ 
        departmentId, 
        region, 
        active: true 
      }).sort({ currentLoad: 1 });
    }

    // 3. Fallback to any officer in the department if no officer found in the region
    if (!officer) {
      officer = await Officer.findOne({ 
        departmentId, 
        active: true 
      }).sort({ currentLoad: 1 });
    }

    // 4. Fallback to any active officer in the system
    if (!officer) {
      officer = await Officer.findOne({ active: true }).sort({ currentLoad: 1 });
    }

    if (!officer) {
      return { departmentId, officerId: null };
    }

    // Increment current load
    officer.currentLoad = (officer.currentLoad || 0) + 1;
    await officer.save();
    
    return {
      departmentId: department._id,
      officerId: officer._id,
      officerName: officer.name, // for backward compatibility
      departmentName: department.name
    };
  } catch (error) {
    console.error("Assignment Error:", error);
    return { departmentId: null, officerId: null };
  }
};
