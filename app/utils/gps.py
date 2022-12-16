from geopy.geocoders import Nominatim
from geopy import distance
import time
from scipy.spatial.distance import pdist, squareform


# [Getting coordinates from address]


def coords_by_address(address: str):
    app = Nominatim(user_agent="pizza-drone")
    time.sleep(1)
    try:
        location = app.geocode(address)
        lon = float(location.longitude)
        lat = float(location.latitude)
        return [lat, lon]

    except:
        return coords_by_address(address)

# [Getting distance between two coordinates]


def dist_between_coords(coords1, coords2):
    miles = distance.geodesic(coords1, coords2).miles
    return miles

# [Getting distances between all coordinates]


def distance_matrix(coords):
    dist_array = pdist(coords)
    dist_matrix = squareform(dist_array)
    # print(dist_matrix)
    return list(dist_matrix.tolist())


# [Helper function to calculate path distance]
def tsp_path_helper(path, dist):
    return sum(dist[i][j] for i, j in zip(path, path[1:]))

# [Finding optimal path for drone]


def tsp_path(coords):
    dist_matrix = distance_matrix(coords)
    # [Set of all nodes to visit]
    to_visit = set(list(range(len(dist_matrix))))
    # [Current state {(node, visited_nodes): shortest_path}]
    state = {(i, frozenset([0, i])): [0, i]
             for i in list(range(1, len(dist_matrix[0])))}
    # print(state, '\n')
    for _ in list(range(len(dist_matrix) - 2)):
        next_state = {}
        for position, path in state.items():
            # print(position, path)
            current_node, visited = position
            # [Check all nodes that haven't been visited so far]
            for node in to_visit - visited:
                new_path = path + [node]
                new_pos = (node, frozenset(new_path))
                # [Update if (current node, visited) is not in next state or we found shorter path]
                if new_pos not in next_state \
                        or tsp_path_helper(new_path, dist_matrix) < tsp_path_helper(next_state[new_pos], dist_matrix):
                    next_state[new_pos] = new_path

        state = next_state
    # [Find the shortest path and return to starting point]
    shortest_path = min((path + [0] for path in state.values()))
    dist = tsp_path_helper(shortest_path, dist_matrix)
    return shortest_path, dist


# print(tsp_path([[34.165041450000004, -119.22636029264734],
#                  [34.2772814, -119.23266763266079],
#                  [34.17504966518035, -119.17763448936975],
#                  [34.21978605061019, -119.06729615645638],
#                  [34.249636759454894, -119.19504682936139]]))
