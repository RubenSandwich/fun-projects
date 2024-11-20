//!OpenSCAD

module cell() {
  {
    $fn=6;    //set sides to 6
    difference() {
      hull(){
        scale([slope, 1, 1]){
          rotate([0, 0, 30]){
            cylinder(r1=(hex_radius + cell_thickness), r2=(hex_radius + cell_thickness), h=1, center=false);
          }
        }
        rotate([0, 0, 30]){
          translate([0, 0, shell]){
            cylinder(r1=(hex_radius + cell_thickness), r2=(hex_radius + cell_thickness), h=1, center=false);
          }
        }
      }

      translate([0, 0, (cell_thickness * 2)]){
        hull(){
          scale([slope, 1, 1]){
            rotate([0, 0, 30]){
              cylinder(r1=(hex_radius - cell_thickness), r2=(hex_radius - cell_thickness), h=1, center=false);
            }
          }
          rotate([0, 0, 30]){
            translate([0, 0, shell]){
              cylinder(r1=(hex_radius - cell_thickness), r2=(hex_radius - cell_thickness), h=1, center=false);
            }
          }
        }
      }
    }
  }
}

module ring() {
  for (i = [0 : abs(1) : segments]) {
    rotate([0, 0, (i * (angle * 2))]){
      rotate([90, 0, 0]){
        translate([0, 0, (cylinder_radius - shell)]){
          cell();
        }
      }
    }
  }

}

base = true;
base_hole = 21;
base_thick = 4;
cylinder_radius = 55;
cylinder_height = 165;
wall_thickness = 7;
cell_thickness = 1;
segments = 35;
angle = (360 / segments) / 2;
hex_radius = (tan(angle) * cylinder_radius) / cos(30);
shell = wall_thickness - 1;
slope = (hex_radius - (shell * hex_radius) / cylinder_radius) / hex_radius;
layers = ceil(cylinder_height / (hex_radius * 2));

difference() {
  union(){
    for (j = [0 : abs(1) : layers]) {
      rotate([0, 0, (j * angle)]){
        translate([0, 0, (j * (hex_radius * 1.5))]){
          ring();
        }
      }
    }

    if (base) {
      {
        $fn=60;    //set sides to 60
        // Base hole and grill
        difference() {
          cylinder(r1=(cylinder_radius - shell), r2=(cylinder_radius - shell), h=base_thick, center=false);

          cylinder(r1=base_hole, r2=base_hole, h=base_thick, center=false);
          for (k = [0 : abs(15) : 360]) {
            rotate([0, 0, k]){
              translate([32, 0, 0]){
                hull(){
                  cylinder(r1=2, r2=2, h=base_thick, center=false);
                  translate([10, 0, 0]){
                    cylinder(r1=2.6, r2=2.6, h=base_thick, center=false);
                  }
                }
              }
            }
          }

        }
      }
    } else {
      {
        $fn=60;    //set sides to 60
        difference() {
          cylinder(r1=cylinder_radius, r2=cylinder_radius, h=base_thick, center=false);

          cylinder(r1=base_hole, r2=base_hole, h=base_thick, center=false);
          hull(){
            translate([45, 0, 0]){
              cylinder(r1=3, r2=3, h=base_thick, center=false);
            }
            translate([-45, 0, 0]){
              cylinder(r1=3, r2=3, h=base_thick, center=false);
            }
          }
        }
      }
    }

    {
      $fn=240;    //set sides to 240
      difference() {
        cylinder(r1=cylinder_radius, r2=cylinder_radius, h=base_thick, center=false);

        cylinder(r1=(cylinder_radius - shell), r2=(cylinder_radius - shell), h=base_thick, center=false);
      }
    }
  }

  {
    $fn=240;    //set sides to 240
    difference() {
      cylinder(r1=(cylinder_radius + 2), r2=(cylinder_radius + 2), h=(cylinder_height + hex_radius * 3), center=false);

      cylinder(r1=cylinder_radius, r2=cylinder_radius, h=(cylinder_height + hex_radius * 3), center=false);
    }
  }
  {
    $fn=120;    //set sides to 120
    translate([0, 0, (0 - (hex_radius + cell_thickness))]){
      cylinder(r1=(cylinder_radius + 3), r2=(cylinder_radius + 3), h=(hex_radius + cell_thickness), center=false);
    }
  }
  {
    $fn=120;    //set sides to 120
    translate([0, 0, base_thick]){
      cylinder(r1=((cylinder_radius - shell) / cos(angle)), r2=((cylinder_radius - shell) / cos(angle)), h=(cylinder_height + hex_radius * 3), center=false);
    }
  }
}
//hex_radius;
